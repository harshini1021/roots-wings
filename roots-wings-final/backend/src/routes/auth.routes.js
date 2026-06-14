// src/routes/auth.routes.js
const r = require('express').Router();
const c = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
r.post('/register', c.register);
r.post('/login', c.login);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);
r.get('/me', protect, c.getMe);
module.exports = r;
