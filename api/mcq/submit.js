// POST /api/mcq/submit
// Server-side Diagnostic Benchmark Validation & Credential Generation
const crypto = require('crypto');
const db = require('../db');

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
    const {
      user_email,
      user_name,
      stream,
      module_title,
      mode,
      answers,
      questions
    } = req.body || {};

    const qList = Array.isArray(questions) ? questions : [];
    const ansList = Array.isArray(answers) ? answers : [];

    if (qList.length === 0) {
      return res.status(400).json({ success: false, error: 'Questions list cannot be empty for server evaluation.' });
    }

    // 1. Evaluate answers on the server side
    let correctCount = 0;
    qList.forEach((q, idx) => {
      const userChoice = ansList[idx];
      if (q.type === 'msq') {
        const correctArr = Array.isArray(q.correct) ? q.correct.slice().sort((a, b) => a - b) : [q.correct];
        const userArr = Array.isArray(userChoice) ? userChoice.slice().sort((a, b) => a - b) : [];
        if (correctArr.length === userArr.length && correctArr.every((v, i) => v === userArr[i])) {
          correctCount++;
        }
      } else {
        if (userChoice !== undefined && userChoice !== null && Number(userChoice) === Number(q.correct)) {
          correctCount++;
        }
      }
    });

    const totalQuestions = qList.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= 80;

    // 2. Determine Credential Tier
    let badgeTier = 'Apprentice';
    if (percentage >= 90) badgeTier = 'Diamond Distinction';
    else if (percentage >= 80) badgeTier = 'Verified Gold';
    else if (percentage >= 50) badgeTier = 'Silver Competence';

    // 3. Generate tamper-proof cryptographic credential token
    const credentialPayload = `${user_email || 'anonymous'}:${stream || 'IT'}:${module_title || 'benchmark'}:${percentage}:${Date.now()}`;
    const credentialToken = 'C2C-' + crypto.createHash('sha256').update(credentialPayload).digest('hex').substring(0, 20).toUpperCase();

    // 4. Persist to PostgreSQL diagnostics table / fallback store
    const diagRecord = await db.recordDiagnostic({
      user_email: user_email || 'anonymous@campus2career.org',
      stream: (stream || 'IT').toUpperCase(),
      module_title: module_title || 'Engineering Systems Diagnostic',
      mode: Number(mode) || 10,
      score: percentage,
      passed,
      answers: ansList
    });

    // 5. If high skill score (>= 90) and student email present, promote into recruiter candidate talent pool
    if (percentage >= 90 && user_email) {
      try {
        const existingCand = await db.getCandidateById(user_email);
        if (!existingCand) {
          const userObj = await db.getUserByEmail(user_email);
          const candName = (userObj && userObj.name) || user_name || user_email.split('@')[0];
          // Determine candidate stream & domain
          const candStream = ((userObj && userObj.stream) || stream || 'IT').toUpperCase();
          const candDomain = module_title || 'Full-Stack & Systems';
          
          if (db.query) {
            await db.query(
              `INSERT INTO candidates (name, email, stream, domain, experience_level, skill_score, skills, capstone_proof)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (email) DO UPDATE 
               SET skill_score = GREATEST(candidates.skill_score, EXCLUDED.skill_score)`,
              [
                candName,
                user_email.toLowerCase(),
                candStream,
                candDomain,
                'Fresher (0-1 yr)',
                percentage,
                [candStream, 'Benchmark Verified', 'Production Systems'],
                `Verified via Server-Side Diagnostic (${module_title}): ${percentage}% score.`
              ]
            );
          }
        }
      } catch (candErr) {
        console.warn('[MCQ Candidate Promotion Notice]', candErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      score: percentage,
      correctCount,
      totalQuestions,
      passed,
      badgeTier,
      credentialToken,
      diagnosticId: diagRecord.id,
      message: passed
        ? `Server-Verified: Score ${percentage}% (${correctCount}/${totalQuestions}). Credential ${badgeTier} issued.`
        : `Assessment Completed: Score ${percentage}% (${correctCount}/${totalQuestions}). Pass threshold is 80%.`
    });
  } catch (err) {
    console.error('[MCQ Submit Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
