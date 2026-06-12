const { v4: uuid } = require('uuid');
const db = require('../db');

// GET /api/jobs
const getAll = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT j.*, u.name AS poster_name, u.email AS poster_email
      FROM jobs j JOIN users u ON j.posted_by = u.id
      WHERE j.status = 'LIVE'
      ORDER BY j.created_at DESC`).all();
    const jobs = rows.map(r => ({
      id: r.id, title: r.title, company: r.company,
      type: r.type, description: r.description,
      location: r.location || null,
      salary: r.salary || null,
      applyUrl: r.apply_url || null,
      status: r.status,
      createdAt: r.created_at,
      postedBy: { name: r.poster_name, email: r.poster_email },
    }));
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// POST /api/jobs
const create = (req, res) => {
  try {
    const { title, company, type, description, location, salary, applyUrl } = req.body;
    if (!title || !company || !type || !description)
      return res.status(400).json({ error: 'Title, company, type and description are required' });

    const id = uuid();
    db.prepare(`INSERT INTO jobs (id,title,company,type,description,location,salary,apply_url,posted_by,status) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, title, company, type, description,
      location || null, salary || null, applyUrl || null,
      req.user.id, 'PENDING'
    );
    db.prepare(`INSERT INTO activity_log (id,action,performed_by,target_id) VALUES (?,?,?,?)`).run(
      uuid(), `${req.user.name} posted a job: ${title}`, req.user.id, id
    );
    res.status(201).json({ message: 'Job submitted for review', job: { id, title, company, type } });
  } catch (err) {
    console.error('[jobs create error]', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

module.exports = { getAll, create };
