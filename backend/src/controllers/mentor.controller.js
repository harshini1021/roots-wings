const { v4: uuid } = require('uuid');
const db = require('../db');
const { sendEmail, emailTemplates } = require('../services/email.service');

// POST /api/mentors/request
const sendRequest = async (req, res) => {
  try {
    const { alumniId, message } = req.body;

    const row = db.prepare(`
      SELECT a.id, a.mentor, u.name, u.email
      FROM alumni a JOIN users u ON a.user_id = u.id
      WHERE a.id = ?`).get(alumniId);

    if (!row) return res.status(404).json({ error: 'Alumni not found' });
    if (!row.mentor) return res.status(400).json({ error: 'This alumni is not accepting mentorship requests' });

    const id = uuid();
    db.prepare(`INSERT INTO mentor_requests (id,from_user_id,to_alumni_id,message) VALUES (?,?,?,?)`).run(
      id, req.user.id, alumniId, message || null
    );
    db.prepare(`INSERT INTO activity_log (id,action,performed_by) VALUES (?,?,?)`).run(
      uuid(), `${req.user.name} sent a mentorship request to ${row.name}`, req.user.id
    );

    await sendEmail({ to: row.email, ...emailTemplates.mentorRequest(row.name, req.user.name, message) });

    res.status(201).json({ message: 'Mentorship request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
};

module.exports = { sendRequest };
