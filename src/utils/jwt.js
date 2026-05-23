const jwt = require('jsonwebtoken');
const config = require('../config/env');

function assertJwtConfig() {
  if (!config.jwt.secret) {
    throw new Error('JWT_SECRET is not set');
  }
}

const generateToken = (payload) => {
  assertJwtConfig();
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

const verifyToken = (token) => {
  assertJwtConfig();
  return jwt.verify(token, config.jwt.secret);
};

module.exports = { generateToken, verifyToken };

