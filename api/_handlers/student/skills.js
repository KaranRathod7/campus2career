// GET & POST /api/student/skills
// Loads or updates persisted student skills from student_skill_progress
const db = require('../db');
const { verifyUser } = require('../authMiddleware');
const skillsSyncHandler = require('./skills-sync');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return skillsSyncHandler(req, res);
  }

  if (req.method === 'GET') {
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
          count: 0,
          skills: []
        });
      }

      // Resolve user's actual registered stream from database if omitted
      let userRecord = null;
      if (user_id) userRecord = await db.getUserById(user_id);
      if (!userRecord && user_email) userRecord = await db.getUserByEmail(user_email);
      if (userRecord) {
        user_id = userRecord.id;
        user_email = userRecord.email;
        stream = userRecord.stream || stream;
      }

      const skills = await db.getStudentSkills({
        user_id,
        user_email,
        stream
      });

      return res.status(200).json({
        success: true,
        count: skills.length,
        skills
      });
    } catch (err) {
      console.error('[Student Skills Handler Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed. Use GET or POST.' });
};
