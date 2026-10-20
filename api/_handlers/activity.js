// POST /api/student/activity
// Persists student learning activity (quizzes, study timers, revision sessions) directly to Supabase/PostgreSQL
// Recalculates readiness_score in the candidates table based on cumulative activity
const db = require('./db');
const { verifyUser } = require('./authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const { 
      activity_type, 
      topic, 
      score, 
      time_spent_minutes, 
      competence,
      stream 
    } = body;

    // 1. Authenticate student via session cookie or Bearer token
    let user_id = null;
    let user_email = null;
    let user_name = null;
    let user_stream = null;

    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
      user_name = auth.user.name;
      user_stream = auth.user.stream;
    } else if (body.user_email || body.email) {
      // Fallback if provided in body
      user_email = (body.user_email || body.email).trim().toLowerCase();
      try {
        const existing = await db.getUserByEmail(user_email);
        if (existing) {
          user_id = existing.id;
          user_name = existing.name;
          user_stream = existing.stream;
        }
      } catch (e) {}
    } else if (body.user_id) {
      user_id = body.user_id;
    }

    if (!user_id && !user_email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Student session or identification required to log study activity.'
      });
    }

    // 2. Validate and normalize activity_type
    // Accepted canonical types: 'quiz' | 'timer' | 'revision'
    let normType = (activity_type || 'timer').toLowerCase().trim();
    if (normType === 'study_timer' || normType === 'study') normType = 'timer';
    if (normType === 'lecture_timer' || normType === 'lecture' || normType === 'masterclass') normType = 'revision';
    if (normType === 'exam' || normType === 'mcq') normType = 'quiz';

    const validTypes = ['quiz', 'timer', 'revision'];
    if (!validTypes.includes(normType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity_type "${activity_type}". Must be one of: quiz, timer, revision.`
      });
    }

    const cleanTopic = (topic || body.module_name || 'Core Engineering Track').trim();
    const timeSpent = Math.max(0, Number(time_spent_minutes !== undefined ? time_spent_minutes : body.duration_minutes) || 0);
    const scoreVal = (score !== undefined && score !== null && !isNaN(score)) 
      ? Number(score) 
      : (body.score !== undefined && body.score !== null && !isNaN(body.score) ? Number(body.score) : null);
    const competenceVal = Math.min(100, Math.max(0, Number(competence !== undefined ? competence : body.competence_rating) || (scoreVal !== null ? scoreVal : 75)));
    const targetStream = (stream || user_stream || 'IT').toUpperCase();

    // 3. Insert into student_activity and recalculate readiness score
    const result = await db.recordStudentActivity({
      user_id,
      user_email,
      user_name,
      stream: targetStream,
      topic: cleanTopic,
      activity_type: normType,
      score: scoreVal,
      time_spent_minutes: timeSpent,
      competence_rating: competenceVal
    });

    return res.status(200).json({
      success: true,
      message: `Activity "${normType}" successfully recorded in student_activity.`,
      activity: result.activity,
      readiness_score: result.readiness_score,
      competence: result.competence_rating,
      total_study_minutes: result.total_study_minutes
    });
  } catch (err) {
    console.error('[Student Activity Handler Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
