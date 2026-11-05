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
    const skillName = body.core_skill || body.coreSkill || body.skillName || body.skill_name;
    const testTitle = body.test_skill || body.testSkill || body.testTitle || body.test_title || `${skillName} Assessment`;
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

    const resolvedUuid = await db.resolveUserUuid(userId);
    const effectiveUserId = resolvedUuid || userId;

    // 1. If Supabase Client is configured with valid credentials, execute via Supabase SDK
    const sb = db.getSupabaseClient() || supabase;
    if (sb) {
      try {
        let insertData = {
          user_id: effectiveUserId,
          core_skill: skillName,
          test_skill: testTitle,
          skill_name: skillName,
          test_title: testTitle,
          score: score,
          score_percentage: score,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          metadata: breakdown
        };

        let { data: attempt, error: insertError } = await sb
          .from('student_test_attempts')
          .insert([insertData])
          .select()
          .single();

        if (insertError && (insertError.message.includes('score_percentage') || insertError.message.includes('column'))) {
          delete insertData.score_percentage;
          const retryRes = await sb
            .from('student_test_attempts')
            .insert([insertData])
            .select()
            .single();
          attempt = retryRes.data;
          insertError = retryRes.error;
        }

        if (insertError) throw insertError;

        // Fetch the current progress summary for targeted skill
        let { data: currentProgress, error: fetchError } = await sb
          .from('student_skill_progress')
          .select('*')
          .eq('user_id', effectiveUserId)
          .ilike('skill_name', skillName)
          .single();

        // Calculate incremental progression and enforce 80% mastery gate
        const currentBase = currentProgress ? (Number(currentProgress.base_percentage) || 35) : 35;
        const currentDiag = currentProgress ? (Number(currentProgress.diagnostic_score) || 0) : 0;
        const currentLec = currentProgress ? (Number(currentProgress.lecture_score) || 0) : 0;
        const currentMar = currentProgress ? (Number(currentProgress.marathon_score) || 0) : 0;
        const gain = Math.max(0, Math.min(5, Math.round((score / 100) * 5)));
        const newDiag = Math.min(34, currentDiag + gain);
        const rawTotal = currentBase + currentLec + currentMar + newDiag;

        let newTotal = rawTotal;
        let newStatus = 'LIVE VERIFIED';
        if (rawTotal > 80 && score < 100) {
          newTotal = 80;
          newStatus = '80% CAP (Score 100% on Benchmark to Unlock Master Level)';
        } else {
          newTotal = Math.min(100, Math.max(20, rawTotal));
          newStatus = 'LIVE VERIFIED';
        }
        const isVerified = true;

        const { data: upsertedProgress, error: upError } = await sb
          .from('student_skill_progress')
          .upsert({
            user_id: effectiveUserId,
            skill_name: skillName,
            category: (currentProgress && currentProgress.category) || 'Core Skill',
            base_percentage: currentBase,
            diagnostic_score: newDiag,
            lecture_score: currentLec,
            marathon_score: currentMar,
            total_score: newTotal,
            latest_exam_score: score,
            status: newStatus,
            verified: isVerified,
            last_tested_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,skill_name' })
          .select()
          .single();

        if (!upError && upsertedProgress) {
          currentProgress = upsertedProgress;
        } else if (fetchError || !currentProgress) {
          const fallbackRes = await db.recordTestAttempt({
            user_id: effectiveUserId,
            core_skill: skillName,
            test_skill: testTitle,
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
      user_id: effectiveUserId,
      core_skill: skillName,
      test_skill: testTitle,
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
    return res.status(500).json({ success: false, error: 'Unable to submit assessment at this time. Please try again.' });
  }
}

module.exports = submitTestScore;
module.exports.submitTestScore = submitTestScore;
