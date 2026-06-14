require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /\.vercel\.app$/,
    /localhost/,
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', db: 'postgresql (neon)', timestamp: new Date().toISOString() }));

app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/alumni',  require('./routes/alumni.routes'));
app.use('/api/jobs',    require('./routes/jobs.routes'));
app.use('/api/stories', require('./routes/stories.routes'));
app.use('/api/mentors', require('./routes/mentor.routes'));
app.use('/api/admin',   require('./routes/admin.routes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
