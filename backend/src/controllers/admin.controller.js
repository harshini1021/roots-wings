const { v4: uuid } = require('uuid');
const db = require('../db');
const { sendEmail, emailTemplates } = require('../services/email.service');

// GET /api/admin/stats
const getStats = (req, res) => {
  try {
    const totalAlumni  = db.prepare(`SELECT COUNT(*) AS n FROM alumni WHERE status='APPROVED'`).get().n;
    const pendingAlumni= db.prepare(`SELECT COUNT(*) AS n FROM alumni WHERE status='PENDING'`).get().n;
    const liveJobs     = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE status='LIVE'`).get().n;
    const pendingJobs  = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE status='PENDING'`).get().n;
    const liveStories  = db.prepare(`SELECT COUNT(*) AS n FROM stories WHERE status='LIVE'`).get().n;
    const totalUsers   = db.prepare(`SELECT COUNT(*) AS n FROM users`).get().n;
    res.json({ totalAlumni, pendingAlumni, liveJobs, pendingJobs, liveStories, totalUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/admin/registrations
const getRegistrations = (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id`;
    const params = [];
    if (status) { sql += ' WHERE a.status = ?'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    const alumni = rows.map(r => ({
      id: r.id, year: r.year, field: r.field,
      currentRole: r.current_role, mentor: r.mentor === 1,
      status: r.status, createdAt: r.created_at,
      user: { name: r.name, email: r.email },
    }));
    res.json({ alumni });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
};

// PUT /api/admin/registrations/:id
const updateRegistration = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status))
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });

    const row = db.prepare(`
      SELECT a.id, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Registration not found' });

    db.prepare(`UPDATE alumni SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    db.prepare(`INSERT INTO activity_log (id,action,performed_by,target_id) VALUES (?,?,?,?)`).run(
      uuid(), `${row.name}'s registration was ${status.toLowerCase()}`, req.user.id, req.params.id
    );

    const tmpl = status === 'APPROVED' ? emailTemplates.approved(row.name) : emailTemplates.rejected(row.name);
    await sendEmail({ to: row.email, ...tmpl });

    res.json({ message: `Registration ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update registration' });
  }
};

// GET /api/admin/jobs
const getJobs = (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT j.*, u.name AS poster_name, u.email AS poster_email FROM jobs j JOIN users u ON j.posted_by = u.id`;
    const params = [];
    if (status) { sql += ' WHERE j.status = ?'; params.push(status); }
    sql += ' ORDER BY j.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    const jobs = rows.map(r => ({
      id: r.id, title: r.title, company: r.company,
      type: r.type, description: r.description, status: r.status, createdAt: r.created_at,
      postedBy: { name: r.poster_name, email: r.poster_email },
    }));
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// PUT /api/admin/jobs/:id
const updateJob = (req, res) => {
  try {
    const { status } = req.body;
    if (!['LIVE', 'REMOVED', 'PENDING'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const job = db.prepare('SELECT title FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    db.prepare(`UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    db.prepare(`INSERT INTO activity_log (id,action,performed_by,target_id) VALUES (?,?,?,?)`).run(
      uuid(), `Job "${job.title}" was set to ${status.toLowerCase()}`, req.user.id, req.params.id
    );
    res.json({ message: `Job ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job' });
  }
};

// GET /api/admin/stories
const getStories = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.id, s.quote, s.detail, s.status, s.created_at, s.alumni_id, u.name AS alumni_name
      FROM stories s JOIN alumni a ON s.alumni_id = a.id JOIN users u ON a.user_id = u.id
      ORDER BY s.created_at DESC`).all();
    const stories = rows.map(r => ({
      id: r.id, quote: r.quote, detail: r.detail, status: r.status,
      createdAt: r.created_at,
      name: r.alumni_name,
      alumni: { id: r.alumni_id || '', user: { name: r.alumni_name } },
    }));
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// DELETE /api/admin/stories/:id
const deleteStory = (req, res) => {
  try {
    db.prepare(`UPDATE stories SET status = 'REMOVED' WHERE id = ?`).run(req.params.id);
    db.prepare(`INSERT INTO activity_log (id,action,performed_by,target_id) VALUES (?,?,?,?)`).run(
      uuid(), 'A story was removed by admin', req.user.id, req.params.id
    );
    res.json({ message: 'Story removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove story' });
  }
};

// GET /api/admin/users
const getUsers = (req, res) => {
  try {
    const { role, search } = req.query;
    let sql = `SELECT id, name, email, role, created_at FROM users WHERE 1=1`;
    const params = [];
    if (role)   { sql += ' AND role = ?'; params.push(role); }
    if (search) { sql += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY created_at DESC';
    const users = db.prepare(sql).all(...params);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
};

// GET /api/admin/activity
const getActivity = (req, res) => {
  try {
    const logs = db.prepare(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50`).all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

module.exports = { getStats, getRegistrations, updateRegistration, getJobs, updateJob, getStories, deleteStory, getUsers, deleteUser, getActivity };
