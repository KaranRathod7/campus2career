// POST /api/student/skills/sync
// Syncs student skill baseline evaluations and progress directly to Supabase/PostgreSQL (student_skill_progress)
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
    let user_id = null;
    let user_email = null;

    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      user_id = auth.user.id;
      user_email = auth.user.email;
    } else {
      user_email = (body.user_email || body.email || '').trim().toLowerCase() || null;
      user_id = body.user_id || null;
    }

    if (!user_id && !user_email) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Student authentication required to sync skills.'
      });
    }

    const stream = body.stream || (auth.valid && auth.user && (auth.user.stream || auth.user.branch)) || null;
    const skills = body.skills || (Array.isArray(body) ? body : [body]);
    const synced = await db.syncStudentSkills({
      user_id,
      user_email,
      stream,
      skills
    });

    return res.status(200).json({
      success: true,
      message: 'Student skills synced successfully.',
      count: synced.length,
      skills: synced
    });
  } catch (err) {
    console.error('[Student Skills Sync Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
