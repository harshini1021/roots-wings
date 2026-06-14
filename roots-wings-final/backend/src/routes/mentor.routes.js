const r = require('express').Router();
const c = require('../controllers/mentor.controller');
const { protect } = require('../middleware/auth.middleware');
r.post('/request', protect, c.sendRequest);
module.exports = r;
