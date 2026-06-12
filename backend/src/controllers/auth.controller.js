const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { generateToken, generateResetToken } = require('../services/token.service');
const { sendEmail, emailTemplates } = require('../services/email.service');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, year, field, currentRole, mentor } = req.body;
    if (!name || !email || !password || !year || !field || !currentRole)
      return res.status(400).json({ error: 'All fields are required' });

    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId   = uuid();
    const alumniId = uuid();
    const isMentor = mentor === true || mentor === 'true' ? 1 : 0;

    // Insert one by one (no transaction wrapper — sql.js saves after each)
    db.prepare('INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)').run(
      userId, name, email, passwordHash, 'ALUMNI'
    );
    db.prepare('INSERT INTO alumni (id,user_id,year,field,current_role,mentor,status) VALUES (?,?,?,?,?,?,?)').run(
      alumniId, userId, year, field, currentRole, isMentor, 'PENDING'
    );
    db.prepare('INSERT INTO activity_log (id,action,performed_by) VALUES (?,?,?)').run(
      uuid(), `${name} submitted an alumni registration`, userId
    );

    await sendEmail({ to: email, ...emailTemplates.welcome(name) });

    const token = generateToken(userId);
    res.status(201).json({
      message: 'Registration successful. Pending admin approval.',
      token,
      user: { id: userId, name, email, role: 'ALUMNI' },
    });
  } catch (err) {
    console.error('[register error]', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const alumni = db.prepare('SELECT status FROM alumni WHERE user_id = ?').get(user.id);
    const token  = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, alumniStatus: alumni?.status || null },
    });
  } catch (err) {
    console.error('[login error]', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token     = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_resets (id,user_id,token,expires_at) VALUES (?,?,?,?)').run(
      uuid(), user.id, token, expiresAt
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot.html?token=${token}`;
    await sendEmail({ to: email, ...emailTemplates.passwordReset(user.name, resetUrl) });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const record = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token);
    if (!record || new Date(record.expires_at) < new Date())
      return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      passwordHash, record.user_id
    );
    db.prepare('DELETE FROM password_resets WHERE token = ?').run(token);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  try {
    const user   = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id = ?').get(req.user.id);
    const alumni = db.prepare('SELECT * FROM alumni WHERE user_id = ?').get(req.user.id);
    res.json({ user: { ...user, alumni: alumni || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getMe };
