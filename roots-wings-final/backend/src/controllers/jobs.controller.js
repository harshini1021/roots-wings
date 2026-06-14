const { v4: uuid } = require('uuid');
const { query } = require('../db');

const getAll = async (req, res) => {
  try {
    const result = await query(`
      SELECT j.*, u.name AS poster_name, u.email AS poster_email
      FROM jobs j JOIN users u ON j.posted_by = u.id
      WHERE j.status = 'LIVE' ORDER BY j.created_at DESC`);
    const jobs = result.rows.map(r => ({
      id: r.id, title: r.title, company: r.company,
      type: r.type, description: r.description,
      location: r.location, salary: r.salary, applyUrl: r.apply_url,
      status: r.status, createdAt: r.created_at,
      postedBy: { name: r.poster_name, email: r.poster_email },
    }));
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

const create = async (req, res) => {
  try {
    const { title, company, type, description, location, salary, applyUrl } = req.body;
    if (!title || !company || !type || !description)
      return res.status(400).json({ error: 'Title, company, type and description are required' });

    const id = uuid();
    await query(
      `INSERT INTO jobs (id,title,company,type,description,location,salary,apply_url,posted_by,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, title, company, type, description, location||null, salary||null, applyUrl||null, req.user.id, 'PENDING']
    );
    await query('INSERT INTO activity_log (id,action,performed_by,target_id) VALUES ($1,$2,$3,$4)',
      [uuid(), `${req.user.name} posted a job: ${title}`, req.user.id, id]);
    res.status(201).json({ message: 'Job submitted for review', job: { id, title, company, type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

module.exports = { getAll, create };
