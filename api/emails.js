const fs = require('fs');
const path = require('path');
const OUTBOX_FILE = path.join(__dirname, '..', 'emails_outbox.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let emails = [];
  if (fs.existsSync(OUTBOX_FILE)) {
    try {
      emails = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf-8'));
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    emails
  });
};
