const crypto = require('node:crypto');

function generateEId() {
  // Human readable + unique enough for demo usage
  return `E_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input ?? ''), 'utf8').digest('hex');
}

module.exports = { generateEId, sha256Hex };

