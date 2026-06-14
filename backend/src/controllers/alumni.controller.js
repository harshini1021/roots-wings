const { query } = require('../db');

const getAll = async (req, res) => {
  try {
    const { field, mentor, search, status } = req.query;
    let sql = `SELECT a.*, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id WHERE a.status = $1`;
    const params = [status || 'APPROVED'];
    let i = 2;
    if (field)  { sql += ` AND a.field = $${i++}`; params.push(field); }
    if (mentor === 'true') { sql += ` AND a.mentor = TRUE`; }
    if (search) { sql += ` AND (u.name ILIKE $${i} OR a.job_role ILIKE $${i})`; params.push(`%${search}%`); i++; }
    sql += ' ORDER BY a.created_at DESC';

    const result = await query(sql, params);
    const alumni = result.rows.map(r => ({
      id: r.id, year: r.year, field: r.field,
      currentRole: r.job_role, bio: r.bio,
      mentor: r.mentor, status: r.status, createdAt: r.created_at,
      user: { id: r.user_id, name: r.name, email: r.email },
    }));
    res.json({ alumni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

const getStats = async (req, res) => {
  try {
    const [a, m, j, s] = await Promise.all([
      query(`SELECT COUNT(*) FROM alumni WHERE status='APPROVED'`),
      query(`SELECT COUNT(*) FROM alumni WHERE status='APPROVED' AND mentor=TRUE`),
      query(`SELECT COUNT(*) FROM jobs WHERE status='LIVE'`),
      query(`SELECT COUNT(*) FROM stories WHERE status='LIVE'`),
    ]);
    res.json({
      totalAlumni: parseInt(a.rows[0].count),
      mentors:     parseInt(m.rows[0].count),
      liveJobs:    parseInt(j.rows[0].count),
      liveStories: parseInt(s.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

const getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id WHERE a.id = $1`,
      [req.params.id]
    );
    const r = result.rows[0];
    if (!r) return res.status(404).json({ error: 'Alumni not found' });
    res.json({ alumni: {
      id: r.id, year: r.year, field: r.field,
      currentRole: r.job_role, bio: r.bio,
      mentor: r.mentor, status: r.status,
      user: { id: r.user_id, name: r.name, email: r.email },
    }});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

module.exports = { getAll, getOne, getStats };
