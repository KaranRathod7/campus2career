const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, oldSnippet, newSnippet) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCrlf = content.includes('\r\n');
  const eol = isCrlf ? '\r\n' : '\n';

  const normalizedOld = oldSnippet.replace(/\r?\n/g, eol);
  const normalizedNew = newSnippet.replace(/\r?\n/g, eol);

  if (content.includes(normalizedOld)) {
    content = content.replace(normalizedOld, normalizedNew);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[SUCCESS] Updated ${filePath}`);
    return true;
  } else {
    console.error(`[ERROR] Could not find target in ${filePath}`);
    return false;
  }
}

// 1. submit.js
replaceInFile(
  path.join(__dirname, '..', 'api', '_handlers', 'tests', 'submit.js'),
  `        // Fetch the newly updated progress summary
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
        }`,
  `        // Fetch the current progress summary for targeted skill
        let { data: currentProgress, error: fetchError } = await supabase
          .from('student_skill_progress')
          .select('*')
          .eq('user_id', userId)
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
        let newStatus = 'UNVERIFIED BASELINE';
        if (rawTotal > 80 && score < 100) {
          newTotal = 80;
          newStatus = '80% CAP (Score 100% on Benchmark to Unlock Master Level)';
        } else if (score >= 80 || rawTotal >= 80) {
          newTotal = Math.min(100, Math.max(20, rawTotal));
          newStatus = 'LIVE VERIFIED';
        } else {
          newTotal = Math.min(100, Math.max(20, rawTotal));
          newStatus = 'UNVERIFIED BASELINE';
        }
        const isVerified = (score >= 80) || (newTotal >= 80);

        const { data: upsertedProgress, error: upError } = await supabase
          .from('student_skill_progress')
          .upsert({
            user_id: userId,
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
            user_id: userId,
            skill_name: skillName,
            test_title: testTitle,
            score: score,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            metadata: breakdown
          });
          currentProgress = fallbackRes.summary;
        }`
);

// 2. register.js
replaceInFile(
  path.join(__dirname, '..', 'api', '_handlers', 'register.js'),
  `    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();`,
  `    // Auto-seed default stream skills and candidate record (No manual CSV imports needed)
    try {
      await db.autoSeedStudentSkills({
        user_id: userRecord.id,
        user_email: userRecord.email,
        user_name: userRecord.name,
        stream: userRecord.stream || stream || 'IT',
        base_percentage: 35
      });
    } catch (seedErr) {
      console.warn('[Registration Auto-Seed Notice]:', seedErr.message);
    }

    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();`
);

// 3. student/dashboard.js
replaceInFile(
  path.join(__dirname, '..', 'api', '_handlers', 'student', 'dashboard.js'),
  `    const skills = await db.getStudentSkills({
      user_id,
      user_email
    });`,
  `    let skills = await db.getStudentSkills({
      user_id,
      user_email,
      stream: stream || 'IT'
    });

    if (!skills || skills.length === 0) {
      skills = await db.autoSeedStudentSkills({
        user_id,
        user_email,
        stream: stream || 'IT'
      });
    }`
);
