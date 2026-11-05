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

    if (!userId && !user_email) {
      return res.status(200).json({
        success: true,
        userId: null,
        user_id: null,
        skills: [],
        timeline: [],
        study_hours: 0,
        total_study_minutes: 0,
        streak_days: 0,
        benchmarks_taken: 0,
        avg_exam_score: 0,
        growth_percent: 0,
        readiness_score: 35,
        skill_competencies: []
      });
    }

    let userRecord = null;
    if (userId) userRecord = await db.getUserById(userId);
    if (!userRecord && user_email) userRecord = await db.getUserByEmail(user_email);
    if (userRecord) {
      userId = userRecord.id;
      user_email = userRecord.email;
      stream = userRecord.stream || stream;
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
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        if (!tErr && aTimeline) {
          attemptTimeline = aTimeline.map(t => ({
            ...t,
            core_skill: t.core_skill || t.skill_name,
            test_skill: t.test_skill || t.test_title,
            skill_name: t.core_skill || t.skill_name,
            test_title: t.test_skill || t.test_title,
          }));
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
      stream
    });

    return res.status(200).json({
      success: true,
      userId,
      user_id: userId,
      stream,
      skills: (skillOverview && skillOverview.length > 0) ? skillOverview : (analytics.skill_competencies || []),
      timeline: attemptTimeline,
      testAttempts: attemptTimeline || (analytics && analytics.attempts) || [],
      ...analytics
    });
  } catch (err) {
    console.error('[Student Analytics Handler Error]', err);
    return res.status(500).json({ error: err.message, success: false });
  }
}

module.exports = getStudentAnalytics;
module.exports.getStudentAnalytics = getStudentAnalytics;
