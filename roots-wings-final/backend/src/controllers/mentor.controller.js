const { v4: uuid } = require('uuid');
const { query } = require('../db');
const { sendEmail, emailTemplates } = require('../services/email.service');

const sendRequest = async (req, res) => {
  try {
    const { alumniId, message } = req.body;
    const result = await query(
      `SELECT a.id, a.mentor, u.name, u.email FROM alumni a JOIN users u ON a.user_id = u.id WHERE a.id = $1`,
      [alumniId]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Alumni not found' });
    if (!row.mentor) return res.status(400).json({ error: 'This alumni is not accepting requests' });

    const id = uuid();
    await query('INSERT INTO mentor_requests (id,from_user_id,to_alumni_id,message) VALUES ($1,$2,$3,$4)',
      [id, req.user.id, alumniId, message || null]);
    await query('INSERT INTO activity_log (id,action,performed_by) VALUES ($1,$2,$3)',
      [uuid(), `${req.user.name} sent a mentorship request to ${row.name}`, req.user.id]);

    await sendEmail({ to: row.email, ...emailTemplates.mentorRequest(row.name, req.user.name, message) });
    res.status(201).json({ message: 'Mentorship request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
};

module.exports = { sendRequest };
