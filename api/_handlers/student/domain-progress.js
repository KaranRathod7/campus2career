const db = require('../db');
const { verifyUser } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = verifyUser(req);
    let email = (auth.valid && auth.user && auth.user.email) || (req.body && req.body.email) || (req.query && req.query.email);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User authentication required.' });
    }
    email = email.trim().toLowerCase();

    if (req.method === 'POST') {
      const { stream, domain, mastery_percent, skill_scores } = req.body || {};
      const saved = await db.saveDomainProgress({
        email,
        stream,
        domain,
        mastery_percent,
        skill_scores
      });
      return res.status(200).json({ success: true, progress: saved });
    }

    // GET
    const records = await db.getDomainProgress(email);
    return res.status(200).json({ success: true, records });
  } catch (err) {
    console.error('[Domain Progress Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
