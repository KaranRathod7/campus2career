// POST /api/student/lecture-progress
// Enforces 85% active watch-time verification and idempotent lecture progress tracking
const db = require('../db');
const { verifyUser } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST or GET.' });
  }

  try {
    let user_id = null;
    let user_email = null;

    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
    }

    if (req.method === 'GET') {
      const q = req.query || {};
      const completedLectures = await db.getCompletedLectures({
        user_id: user_id || q.user_id,
        user_email: user_email || q.user_email || q.email,
        skill_name: q.skill_name
      });
      return res.status(200).json({ success: true, completed_lectures: completedLectures });
    }

    const b = req.body || {};
    const lecture_id = b.lecture_id;
    const skill_name = b.skill_name;
    const duration_seconds = parseInt(b.duration_seconds, 10);
    const time_watched_seconds = parseInt(b.time_watched_seconds, 10);

    user_id = user_id || b.user_id;
    user_email = user_email || b.user_email || b.email;

    if (!lecture_id || !skill_name) {
      return res.status(400).json({ success: false, error: 'Missing lecture_id or skill_name in payload.' });
    }

    if (isNaN(duration_seconds) || isNaN(time_watched_seconds) || duration_seconds <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid duration_seconds or time_watched_seconds.' });
    }

    const result = await db.recordLectureProgress({
      user_id,
      user_email,
      skill_name,
      lecture_id,
      duration_seconds,
      time_watched_seconds
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[Lecture Progress API Error]', err);
    return res.status(500).json({ success: false, error: 'Unable to update lecture progress at this time. Please try again.' });
  }
};
