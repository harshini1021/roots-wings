const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { generateToken, generateResetToken };
