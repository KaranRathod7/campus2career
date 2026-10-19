// GET /api/me
const { verifyUser, verifyAdmin } = require('./authMiddleware');
const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle Profile Update (Onboarding Preferences)
  if (req.method === 'POST' || req.method === 'PUT') {
    const userCheck = verifyUser(req);
    let email = null;
    if (userCheck.valid && userCheck.user) {
      email = userCheck.user.email;
    } else if (req.body && req.body.email) {
      email = req.body.email.trim().toLowerCase();
    }

    if (!email) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User authentication required.' });
    }

    const { stream, branch, skills, college, year } = req.body || {};
    const updated = await db.updateUserProfile({
      email,
      stream,
      branch,
      skills,
      college,
      year
    });

    return res.status(200).json({
      success: true,
      message: 'User profile successfully updated.',
      user: updated
    });
  }

  // Check admin first
  const adminCheck = verifyAdmin(req);
  if (adminCheck.valid) {
    return res.status(200).json({
      success: true,
      role: 'admin',
      user: adminCheck.admin
    });
  }

  // Check user session
  const userCheck = verifyUser(req);
  if (userCheck.valid) {
    const dbUser = await db.getUserByEmail(userCheck.user.email);
    return res.status(200).json({
      success: true,
      role: userCheck.user.role || 'learner',
      user: dbUser ? {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        stream: dbUser.stream,
        branch: dbUser.branch || dbUser.stream,
        skills: dbUser.skills,
        college: dbUser.college,
        year: dbUser.year,
        is_verified: dbUser.is_verified,
        total_study_minutes: Number(dbUser.total_study_minutes) || 0,
        total_lecture_minutes: Number(dbUser.total_lecture_minutes) || 0,
        avg_exam_score: Number(dbUser.avg_exam_score) || 0,
        dynamic_competence_percent: Number(dbUser.dynamic_competence_percent) || 25.0
      } : userCheck.user
    });
  }

  return res.status(401).json({ success: false, authenticated: false, error: 'No active session.' });
};
