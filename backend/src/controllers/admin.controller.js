const { v4: uuid } = require('uuid');
const { query } = require('../db');
const { sendEmail, emailTemplates } = require('../services/email.service');

const getStats = async (req, res) => {
  try {
    const [a, pa, j, pj, s, u] = await Promise.all([
      query(`SELECT COUNT(*) FROM alumni WHERE status='APPROVED'`),
      query(`SELECT COUNT(*) FROM alumni WHERE status='PENDING'`),
      query(`SELECT COUNT(*) FROM jobs WHERE status='LIVE'`),
      query(`SELECT COUNT(*) FROM jobs WHERE status='PENDING'`),
      query(`SELECT COUNT(*) FROM stories WHERE status='LIVE'`),
      query(`SELECT COUNT(*) FROM users`),
    ]);
    res.json({
      totalAlumni:  parseInt(a.rows[0].count),
      pendingAlumni:parseInt(pa.rows[0].count),
      liveJobs:     parseInt(j.rows[0].count),
      pendingJobs:  parseInt(pj.rows[0].count),
      liveStories:  parseInt(s.rows[0].count),
      totalUsers:   parseInt(u.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

const getRegistrations = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id`;
    const params = [];
    if (status) { sql += ' WHERE a.status = $1'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';
    const result = await query(sql, params);
    const alumni = result.rows.map(r => ({
      id: r.id, year: r.year, field: r.field,
      currentRole: r.job_role, mentor: r.mentor,
      status: r.status, createdAt: r.created_at,
      user: { name: r.name, email: r.email },
    }));
    res.json({ alumni });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
};

const updateRegistration = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status))
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });

    const result = await query(
      `SELECT a.id, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id WHERE a.id = $1`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Registration not found' });

    await query(`UPDATE alumni SET status = $1, updated_at = NOW() WHERE id = $2`, [status, req.params.id]);
    await query('INSERT INTO activity_log (id,action,performed_by,target_id) VALUES ($1,$2,$3,$4)',
      [uuid(), `${row.name}'s registration was ${status.toLowerCase()}`, req.user.id, req.params.id]);

    const tmpl = status === 'APPROVED' ? emailTemplates.approved(row.name) : emailTemplates.rejected(row.name);
    await sendEmail({ to: row.email, ...tmpl });
    res.json({ message: `Registration ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update registration' });
  }
};

const getJobs = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT j.*, u.name AS poster_name, u.email AS poster_email FROM jobs j JOIN users u ON j.posted_by = u.id`;
    const params = [];
    if (status) { sql += ' WHERE j.status = $1'; params.push(status); }
    sql += ' ORDER BY j.created_at DESC';
    const result = await query(sql, params);
    const jobs = result.rows.map(r => ({
      id: r.id, title: r.title, company: r.company,
      type: r.type, description: r.description, status: r.status, createdAt: r.created_at,
      postedBy: { name: r.poster_name, email: r.poster_email },
    }));
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

const updateJob = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['LIVE', 'REMOVED', 'PENDING'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const result = await query('SELECT title FROM jobs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    await query(`UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2`, [status, req.params.id]);
    await query('INSERT INTO activity_log (id,action,performed_by,target_id) VALUES ($1,$2,$3,$4)',
      [uuid(), `Job "${result.rows[0].title}" was set to ${status.toLowerCase()}`, req.user.id, req.params.id]);
    res.json({ message: `Job ${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job' });
  }
};

const getStories = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.quote, s.detail, s.status, s.created_at, s.alumni_id, u.name AS alumni_name
      FROM stories s JOIN alumni a ON s.alumni_id = a.id JOIN users u ON a.user_id = u.id
      ORDER BY s.created_at DESC`);
    const stories = result.rows.map(r => ({
      id: r.id, quote: r.quote, detail: r.detail, status: r.status,
      createdAt: r.created_at, name: r.alumni_name,
      alumni: { id: r.alumni_id, user: { name: r.alumni_name } },
    }));
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

const deleteStory = async (req, res) => {
  try {
    await query(`UPDATE stories SET status = 'REMOVED' WHERE id = $1`, [req.params.id]);
    await query('INSERT INTO activity_log (id,action,performed_by,target_id) VALUES ($1,$2,$3,$4)',
      [uuid(), 'A story was removed by admin', req.user.id, req.params.id]);
    res.json({ message: 'Story removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove story' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let sql = `SELECT id, name, email, role, created_at FROM users WHERE 1=1`;
    const params = [];
    let i = 1;
    if (role)   { sql += ` AND role = $${i++}`; params.push(role); }
    if (search) { sql += ` AND (name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${search}%`); i++; }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove user' });
  }
};

const getActivity = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50`);
    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

module.exports = { getStats, getRegistrations, updateRegistration, getJobs, updateJob, getStories, deleteStory, getUsers, deleteUser, getActivity };
