const db = require('../db');

// GET /api/alumni
const getAll = (req, res) => {
  try {
    const { field, mentor, search, status } = req.query;
    let sql = `
      SELECT a.*, u.name, u.email
      FROM alumni a JOIN users u ON a.user_id = u.id
      WHERE a.status = ?`;
    const params = [status || 'APPROVED'];

    if (field)  { sql += ' AND a.field = ?';           params.push(field); }
    if (mentor === 'true') { sql += ' AND a.mentor = 1'; }
    if (search) {
      sql += ' AND (u.name LIKE ? OR a.current_role LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY a.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    const alumni = rows.map(r => ({
      id: r.id, year: r.year, field: r.field,
      currentRole: r.current_role, bio: r.bio,
      mentor: r.mentor === 1, status: r.status,
      createdAt: r.created_at,
      user: { id: r.user_id, name: r.name, email: r.email },
    }));
    res.json({ alumni });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

// GET /api/alumni/stats
const getStats = (req, res) => {
  try {
    const totalAlumni  = db.prepare(`SELECT COUNT(*) AS n FROM alumni WHERE status='APPROVED'`).get().n;
    const mentors      = db.prepare(`SELECT COUNT(*) AS n FROM alumni WHERE status='APPROVED' AND mentor=1`).get().n;
    const liveJobs     = db.prepare(`SELECT COUNT(*) AS n FROM jobs WHERE status='LIVE'`).get().n;
    const liveStories  = db.prepare(`SELECT COUNT(*) AS n FROM stories WHERE status='LIVE'`).get().n;
    res.json({ totalAlumni, mentors, liveJobs, liveStories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/alumni/:id
const getOne = (req, res) => {
  try {
    const row = db.prepare(`
      SELECT a.*, u.name, u.email
      FROM alumni a JOIN users u ON a.user_id = u.id
      WHERE a.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Alumni not found' });
    res.json({ alumni: {
      id: row.id, year: row.year, field: row.field,
      currentRole: row.current_role, bio: row.bio,
      mentor: row.mentor === 1, status: row.status,
      user: { id: row.user_id, name: row.name, email: row.email },
    }});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
};

module.exports = { getAll, getOne, getStats };
