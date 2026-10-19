// POST /api/student/log-activity
// Logs study timers, lecture watch time, and exam submissions to Supabase/PostgreSQL activity pipeline
// Recalculates user dynamic competence percentage and metrics
const db = require('../db');
const { verifyUser } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    const { activity_type, duration_minutes, score, module_name } = body;

    // 1. Authenticate student
    let user_id = null;
    let user_email = null;

    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
    } else if (body.user_email) {
      // Fallback to body-supplied email if user is transitioning/unauthenticated
      user_email = body.user_email.trim().toLowerCase();
      const existingUser = await db.getUserByEmail(user_email);
      if (existingUser) {
        user_id = existingUser.id;
      }
    }

    if (!user_email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Student authentication required to log activity.'
      });
    }

    // 2. Validate activity type
    const validTypes = ['study_timer', 'lecture_timer', 'exam'];
    if (!activity_type || !validTypes.includes(activity_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity_type "${activity_type}". Must be one of: ${validTypes.join(', ')}.`
      });
    }

    // 3. Process activity insertion and competence recalculation
    const result = await db.logStudentActivity({
      user_id,
      user_email,
      activity_type,
      duration_minutes: duration_minutes ? Number(duration_minutes) : 0,
      score: score !== undefined && score !== null ? Number(score) : null,
      module_name: module_name ? String(module_name).trim() : 'Core Curriculum Module'
    });

    return res.status(200).json({
      success: true,
      message: `Activity "${activity_type}" successfully recorded in student_activity_logs.`,
      activity: result.activity,
      competence: result.competence
    });
  } catch (err) {
    console.error('[Student Log Activity Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
