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
      stream = auth.user.stream || auth.user.branch || null;
    } else {
      const q = req.query || {};
      user_email = (q.user_email || q.email || '').trim().toLowerCase() || null;
      user_id = q.user_id || null;
      stream = q.stream || q.branch || null;
    }

    if (!user_id && !user_email) {
      return res.status(200).json({
        success: true,
        user_id: null,
        user_email: null,
        skills: [],
        analytics: {
          study_hours: 0,
          total_study_minutes: 0,
          streak_days: 0,
          benchmarks_taken: 0,
          avg_exam_score: 0,
          growth_percent: 0,
          readiness_score: 35,
          skill_competencies: []
        }
      });
    }

    // Resolve user's actual registered stream from database if omitted or defaulted
    let userRecord = null;
    if (user_id) userRecord = await db.getUserById(user_id);
    if (!userRecord && user_email) userRecord = await db.getUserByEmail(user_email);
    if (userRecord) {
      user_id = userRecord.id;
      user_email = userRecord.email;
      stream = userRecord.stream || stream;
    }

    // Strictly fetch user's persisted discipline skills
    let skills = await db.getStudentSkills({
      user_id,
      user_email,
      stream
    });

    // Auto-seed strictly using the user's registered stream if empty
    if ((!skills || skills.length === 0) && stream) {
      skills = await db.autoSeedStudentSkills({
        user_id,
        user_email,
        stream
      });
    }

    const analytics = await db.getStudentAnalytics({
      user_id,
      user_email,
      stream
    });

    return res.status(200).json({
      success: true,
      user_id,
      user_email,
      stream,
      skills: skills || [],
      analytics
    });
  } catch (err) {
    console.error('[Student Dashboard Handler Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
