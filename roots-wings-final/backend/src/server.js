require('dotenv').config();
const { initDb } = require('./db');
const PORT = process.env.PORT || 5000;

initDb().then(() => {
  const app = require('./app');
  app.listen(PORT, () => {
    console.log(`🌿 Roots & Wings API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
