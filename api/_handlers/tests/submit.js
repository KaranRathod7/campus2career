// POST /api/tests/submit
// Student Test Attempt Submission & Automatic Skill Progress Aggregation
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');
const { verifyUser } = require('../authMiddleware');

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.warn('[Supabase Client Initialization Notice]', e.message);
  }
}

async function submitTestScore(req, res) {
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
    let userId = body.userId || body.user_id;
    const skillName = body.skillName || body.skill_name;
    const testTitle = body.testTitle || body.test_title || `${skillName} Assessment`;
    const score = (body.score !== undefined && body.score !== null && !isNaN(body.score)) ? Number(body.score) : undefined;
    const totalQuestions = Number(body.totalQuestions !== undefined ? body.totalQuestions : body.total_questions) || 0;
    const correctAnswers = Number(body.correctAnswers !== undefined ? body.correctAnswers : body.correct_answers) || 0;
    const breakdown = body.breakdown || body.metadata || {};

    // Auto-detect userId from session cookie if omitted from request body
    if (!userId) {
      const auth = verifyUser(req);
      if (auth.valid && auth.user && auth.user.id) {
        userId = auth.user.id;
      }
    }

    if (!userId || score === undefined || !skillName) {
      return res.status(400).json({ error: 'Missing required test parameters.' });
    }

    // 1. If Supabase Client is configured with valid credentials, execute via Supabase SDK
    if (supabase) {
      try {
        const { data: attempt, error: insertError } = await supabase
          .from('student_test_attempts')
          .insert([
            {
              user_id: userId,
              skill_name: skillName,
              test_title: testTitle,
              score: score,
              total_questions: totalQuestions,
              correct_answers: correctAnswers,
              metadata: breakdown
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        // Fetch the newly updated progress summary
        let { data: currentProgress, error: fetchError } = await supabase
          .from('student_skill_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('skill_name', skillName)
          .single();

        // If row not found yet or trigger is pending, fallback query or sync
        if (fetchError || !currentProgress) {
          const fallbackRes = await db.recordTestAttempt({
            user_id: userId,
            skill_name: skillName,
            test_title: testTitle,
            score: score,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            metadata: breakdown
          });
          currentProgress = fallbackRes.summary;
        }

        return res.status(200).json({
          success: true,
          message: 'Test recorded successfully',
          attempt,
          summary: currentProgress
        });
      } catch (sbErr) {
        console.warn('[Supabase SDK Submission Notice, delegating to DB engine]:', sbErr.message);
      }
    }

    // 2. Direct PostgreSQL Pool / Local In-Memory Store Execution
    const result = await db.recordTestAttempt({
      user_id: userId,
      skill_name: skillName,
      test_title: testTitle,
      score: score,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      metadata: breakdown
    });

    return res.status(200).json({
      success: true,
      message: 'Test recorded successfully',
      attempt: result.attempt,
      summary: result.summary
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = submitTestScore;
module.exports.submitTestScore = submitTestScore;
