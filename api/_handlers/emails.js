const fs = require('fs');
const path = require('path');
const ROOT_DIR = fs.existsSync(path.join(__dirname, '..', '..', 'emails_outbox.json'))
  ? path.join(__dirname, '..', '..')
  : (fs.existsSync(path.join(__dirname, '..', 'emails_outbox.json'))
      ? path.join(__dirname, '..')
      : process.cwd());
const OUTBOX_FILE = path.join(ROOT_DIR, 'emails_outbox.json');

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
