const r = require('express').Router();
const c = require('../controllers/jobs.controller');
const { protect } = require('../middleware/auth.middleware');
r.get('/', protect, c.getAll);
r.post('/', protect, c.create);
module.exports = r;
