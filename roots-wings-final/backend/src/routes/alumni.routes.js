const r = require('express').Router();
const c = require('../controllers/alumni.controller');
const { protect } = require('../middleware/auth.middleware');
r.get('/stats', protect, c.getStats);
r.get('/', protect, c.getAll);
r.get('/:id', protect, c.getOne);
module.exports = r;
