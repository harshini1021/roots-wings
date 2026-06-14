const { v4: uuid } = require('uuid');
const { query } = require('../db');

const getAll = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.quote, s.detail, s.status, s.created_at, s.alumni_id, u.name AS alumni_name
      FROM stories s JOIN alumni a ON s.alumni_id = a.id JOIN users u ON a.user_id = u.id
      WHERE s.status = 'LIVE' ORDER BY s.created_at DESC`);
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

const create = async (req, res) => {
  try {
    const { quote, detail } = req.body;
    if (!quote || !detail) return res.status(400).json({ error: 'Quote and detail required' });

    const alumniRes = await query('SELECT id FROM alumni WHERE user_id = $1', [req.user.id]);
    if (!alumniRes.rows.length) return res.status(400).json({ error: 'Only alumni can share stories' });

    const id = uuid();
    await query('INSERT INTO stories (id,alumni_id,quote,detail,status) VALUES ($1,$2,$3,$4,$5)',
      [id, alumniRes.rows[0].id, quote, detail, 'LIVE']);
    await query('INSERT INTO activity_log (id,action,performed_by,target_id) VALUES ($1,$2,$3,$4)',
      [uuid(), `${req.user.name} shared a new success story`, req.user.id, id]);
    res.status(201).json({ message: 'Story published', story: { id, quote, detail, name: req.user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story' });
  }
};

module.exports = { getAll, create };
