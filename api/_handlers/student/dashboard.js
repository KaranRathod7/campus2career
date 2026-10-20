// GET /api/student/dashboard
// Returns comprehensive persisted student dashboard state: skills breakdown, readiness score, and radar analytics
const db = require('../db');
const { verifyUser } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    let user_id = null;
    let user_email = null;
    let stream = null;

    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
      stream = auth.user.stream;
    } else {
      const q = req.query || {};
      user_email = (q.user_email || q.email || '').trim().toLowerCase() || null;
      user_id = q.user_id || null;
      stream = q.stream || null;
    }

    let skills = await db.getStudentSkills({
      user_id,
      user_email,
      stream: stream || 'IT'
    });

    if (!skills || skills.length === 0) {
      skills = await db.autoSeedStudentSkills({
        user_id,
        user_email,
        stream: stream || 'IT'
      });
    }

    const analytics = await db.getStudentAnalytics({
      user_id,
      user_email,
      stream: stream || 'IT'
    });

    return res.status(200).json({
      success: true,
      user_id,
      user_email,
      skills,
      analytics
    });
  } catch (err) {
    console.error('[Student Dashboard Handler Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
