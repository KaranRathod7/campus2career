// GET /api/student/analytics
// Returns aggregated study hours, completed topics, readiness score, and skill competencies from database
const db = require('./db');
const { verifyUser } = require('./authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let user_id = null;
    let user_email = null;
    let stream = null;

    // Check user session
    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
      stream = auth.user.stream;
    } else {
      const q = req.query || {};
      const b = req.body || {};
      user_email = (q.email || q.user_email || b.email || b.user_email || '').trim().toLowerCase() || null;
      user_id = q.user_id || b.user_id || null;
      stream = q.stream || b.stream || null;
      if (user_email && !user_id) {
        try {
          const u = await db.getUserByEmail(user_email);
          if (u) {
            user_id = u.id;
            stream = stream || u.stream;
          }
        } catch (e) {}
      }
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
      ...analytics
    });
  } catch (err) {
    console.error('[Student Analytics Handler Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
