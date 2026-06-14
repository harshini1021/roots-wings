const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { query } = require('../db');
const { generateToken, generateResetToken } = require('../services/token.service');
const { sendEmail, emailTemplates } = require('../services/email.service');

const register = async (req, res) => {
  try {
    const { name, email, password, year, field, currentRole, mentor } = req.body;
    if (!name || !email || !password || !year || !field || !currentRole)
      return res.status(400).json({ error: 'All fields are required' });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length)
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const userId   = uuid();
    const alumniId = uuid();
    const isMentor = mentor === true || mentor === 'true';

    await query('INSERT INTO users (id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5)',
      [userId, name, email, passwordHash, 'ALUMNI']);
    await query('INSERT INTO alumni (id,user_id,year,field,current_role,mentor,status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [alumniId, userId, year, field, currentRole, isMentor, 'PENDING']);
    await query('INSERT INTO activity_log (id,action,performed_by) VALUES ($1,$2,$3)',
      [uuid(), `${name} submitted an alumni registration`, userId]);

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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const alumniRes = await query('SELECT status FROM alumni WHERE user_id = $1', [user.id]);
    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role,
              alumniStatus: alumniRes.rows[0]?.status || null },
    });
  } catch (err) {
    console.error('[login error]', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token     = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await query('INSERT INTO password_resets (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)',
      [uuid(), user.id, token, expiresAt]);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/forgot.html?token=${token}`;
    await sendEmail({ to: email, ...emailTemplates.passwordReset(user.name, resetUrl) });
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await query('SELECT * FROM password_resets WHERE token = $1', [token]);
    const record = result.rows[0];
    if (!record || new Date(record.expires_at) < new Date())
      return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, record.user_id]);
    await query('DELETE FROM password_resets WHERE token = $1', [token]);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed' });
  }
};

const getMe = async (req, res) => {
  try {
    const userRes  = await query('SELECT id,name,email,role,created_at FROM users WHERE id = $1', [req.user.id]);
    const alumniRes = await query('SELECT * FROM alumni WHERE user_id = $1', [req.user.id]);
    res.json({ user: { ...userRes.rows[0], alumni: alumniRes.rows[0] || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getMe };
