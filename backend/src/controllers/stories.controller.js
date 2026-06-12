const { v4: uuid } = require('uuid');
const db = require('../db');

// GET /api/stories
const getAll = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.*, a.id AS alumni_id, u.name AS alumni_name
      FROM stories s
      JOIN alumni a ON s.alumni_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE s.status = 'LIVE'
      ORDER BY s.created_at DESC`).all();
    const stories = rows.map(r => ({
      id: r.id, quote: r.quote, detail: r.detail, status: r.status,
      createdAt: r.created_at,
      name: r.alumni_name,
      alumni: { id: r.alumni_id, user: { name: r.alumni_name } },
    }));
    res.json({ stories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
};

// POST /api/stories
const create = (req, res) => {
  try {
    const { quote, detail } = req.body;
    if (!quote || !detail) return res.status(400).json({ error: 'Quote and detail required' });

    const alumni = db.prepare('SELECT id FROM alumni WHERE user_id = ?').get(req.user.id);
    if (!alumni) return res.status(400).json({ error: 'Only alumni can share stories' });

    const id = uuid();
    db.prepare(`INSERT INTO stories (id,alumni_id,quote,detail,status) VALUES (?,?,?,?,?)`).run(
      id, alumni.id, quote, detail, 'LIVE'
    );
    db.prepare(`INSERT INTO activity_log (id,action,performed_by,target_id) VALUES (?,?,?,?)`).run(
      uuid(), `${req.user.name} shared a new success story`, req.user.id, id
    );
    res.status(201).json({ message: 'Story published', story: { id, quote, detail, name: req.user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story' });
  }
};

module.exports = { getAll, create };
