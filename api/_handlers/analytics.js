// GET /api/student/analytics
// Returns aggregated study hours, completed topics, readiness score, skill competencies, and test attempt timeline
const { createClient } = require('@supabase/supabase-js');
const db = require('./db');
const { verifyUser } = require('./authMiddleware');

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('[Analytics Supabase Client Load Warning]', e.message);
  }
}

async function getStudentAnalytics(req, res) {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const q = req.query || {};
    const b = req.body || {};
    let userId = q.userId || q.user_id || b.userId || b.user_id || null;
    let user_email = (q.email || q.user_email || b.email || b.user_email || '').trim().toLowerCase() || null;
    let stream = q.stream || b.stream || null;

    // Check user session
    const auth = verifyUser(req);
    if (auth.valid && auth.user) {
      userId = userId || auth.user.id;
      user_email = user_email || auth.user.email;
      stream = stream || auth.user.stream;
    } else if (user_email && !userId) {
      try {
        const u = await db.getUserByEmail(user_email);
        if (u) {
          userId = u.id;
          stream = stream || u.stream;
        }
      } catch (e) {}
    }

    let skillOverview = [];
    let attemptTimeline = [];

    // If Supabase client is configured, execute via Supabase SDK
    if (supabase && userId) {
      try {
        // Fetch aggregate skill summary
        const { data: sOverview, error: sErr } = await supabase
          .from('student_skill_progress')
          .select('*')
          .eq('user_id', userId);
        if (!sErr && sOverview) {
          skillOverview = sOverview;
        }

        // Fetch timeline of all attempts (for line charts)
        const { data: aTimeline, error: tErr } = await supabase
          .from('student_test_attempts')
          .select('skill_name, test_title, score, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (!tErr && aTimeline) {
          attemptTimeline = aTimeline;
        }
      } catch (sbErr) {
        console.warn('[Analytics Supabase SDK Warning]:', sbErr.message);
      }
    }

    // Fallback or fill from DB engine
    if (skillOverview.length === 0 && userId) {
      skillOverview = await db.getStudentSkillProgress(userId);
    }
    if (attemptTimeline.length === 0 && userId) {
      attemptTimeline = await db.getStudentTestAttempts(userId);
    }

    const analytics = await db.getStudentAnalytics({
      user_id: userId,
      user_email,
      stream: stream || 'IT'
    });

    return res.status(200).json({
      success: true,
      userId,
      user_id: userId,
      skills: (skillOverview && skillOverview.length > 0) ? skillOverview : (analytics.skill_competencies || []),
      timeline: attemptTimeline,
      ...analytics
    });
  } catch (err) {
    console.error('[Student Analytics Handler Error]', err);
    return res.status(500).json({ error: err.message, success: false });
  }
}

module.exports = getStudentAnalytics;
module.exports.getStudentAnalytics = getStudentAnalytics;
