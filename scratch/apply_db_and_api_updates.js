const fs = require('fs');
const path = require('path');

// 1. Update api/_handlers/db.js
const dbPath = path.join(__dirname, '..', 'api', '_handlers', 'db.js');
let dbCode = fs.readFileSync(dbPath, 'utf8');

const oldGetStudentSkills = `  // Get Persisted Student Skill Progress
  async getStudentSkills({ user_id, user_email }) {
    const p = initPool();
    let resolvedUserId = user_id;

    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) resolvedUserId = uRes.rows[0].id;
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          const res = await p.query(
            \`SELECT * FROM student_skill_progress
             WHERE user_id = $1
             ORDER BY created_at ASC, skill_name ASC\`,
            [validUuid]
          );
          if (res.rows && res.rows.length > 0) {
            return res.rows;
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentSkills notice:', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? \`usr-\${normEmail}\` : null);

    const skills = (store.student_skill_progress || []).filter(item => 
      (effectiveUserId && item.user_id === effectiveUserId) ||
      (normEmail && item.user_email && item.user_email === normEmail)
    );

    return skills;
  },`.replace(/\r?\n/g, '\r\n');

const newGetStudentSkills = `  // Auto-Seed Default Stream Skills and Candidate Record (No manual CSV imports needed)
  async autoSeedStudentSkills({ user_id, user_email, user_name, stream, base_percentage = 35 }) {
    const rawStream = (stream || 'it').toString().toLowerCase().trim();
    let streamKey = 'it';
    if (rawStream.includes('cse') || rawStream.includes('comp')) streamKey = 'cse';
    else if (rawStream.includes('ece') || rawStream.includes('elect')) streamKey = 'ece';
    else if (rawStream.includes('aid') || rawStream.includes('ai') || rawStream.includes('data')) streamKey = 'aids';
    else if (rawStream.includes('mech')) streamKey = 'mechanical';

    const defaultSkills = DEFAULT_SKILLS_BY_STREAM[streamKey] || DEFAULT_SKILLS_BY_STREAM.it;
    const p = initPool();
    let resolvedUserId = user_id;

    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id, name, stream FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) {
              resolvedUserId = uRes.rows[0].id;
              if (!user_name && uRes.rows[0].name) user_name = uRes.rows[0].name;
            }
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          for (const s of defaultSkills) {
            await p.query(
              \`INSERT INTO student_skill_progress (
                user_id, skill_id, skill_name, category, base_percentage, diagnostic_score, lecture_score, marathon_score, total_score, latest_exam_score, status, verified, current_milestone, next_milestone
              ) VALUES ($1, $2, $3, $4, $5, 0, 0, 0, $5, 0, 'UNVERIFIED BASELINE', false, $6, $7)
              ON CONFLICT (user_id, skill_name) DO NOTHING\`,
              [validUuid, s.id, s.name, s.category, base_percentage, s.current_milestone, s.next_milestone]
            );
          }

          // Also guarantee candidate profile exists in candidates table
          const nameToUse = user_name || 'Candidate';
          const emailToUse = user_email || \`\${validUuid}@campus2career.org\`;
          const skillNames = defaultSkills.map(s => s.name);
          await p.query(
            \`INSERT INTO candidates (user_id, name, email, stream, domain, experience_level, skill_score, dynamic_competence_percent, readiness_score, skills)
             VALUES ($1, $2, $3, $4, 'Core Engineering & Architecture', 'Fresher (0-1 yr)', $5, $5, $5, $6)
             ON CONFLICT (email) DO UPDATE SET user_id = COALESCE(candidates.user_id, EXCLUDED.user_id)\`,
            [validUuid, nameToUse, emailToUse, streamKey.toUpperCase(), base_percentage, skillNames]
          );

          const seeded = await p.query(
            \`SELECT * FROM student_skill_progress WHERE user_id = $1 ORDER BY created_at ASC, skill_name ASC\`,
            [validUuid]
          );
          if (seeded.rows && seeded.rows.length > 0) {
            return seeded.rows;
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud autoSeedStudentSkills notice:', err.message);
      }
    }

    // In-memory local fallback store
    const store = getLocalStore();
    if (!store.student_skill_progress) store.student_skill_progress = [];
    if (!store.candidates) store.candidates = [];

    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? \`usr-\${normEmail}\` : 'usr-default');
    const result = [];

    for (const s of defaultSkills) {
      let existing = store.student_skill_progress.find(item => 
        (item.user_id === effectiveUserId || (item.user_email && item.user_email === normEmail)) &&
        item.skill_name.toLowerCase() === s.name.toLowerCase()
      );
      if (!existing) {
        existing = {
          id: \`ssp-\${Date.now()}-\${s.id}\`,
          user_id: effectiveUserId,
          user_email: normEmail || null,
          skill_id: s.id,
          skill_name: s.name,
          category: s.category,
          base_percentage: base_percentage,
          diagnostic_score: 0,
          lecture_score: 0,
          marathon_score: 0,
          total_score: base_percentage,
          latest_exam_score: 0,
          status: 'UNVERIFIED BASELINE',
          verified: false,
          current_milestone: s.current_milestone,
          next_milestone: s.next_milestone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.student_skill_progress.push(existing);
      }
      result.push(existing);
    }

    if (store.candidates) {
      let cand = store.candidates.find(c => (c.user_id && c.user_id === effectiveUserId) || (normEmail && c.email && c.email.toLowerCase() === normEmail));
      if (!cand) {
        cand = {
          id: \`cand-\${Date.now()}\`,
          user_id: effectiveUserId,
          name: user_name || 'Candidate',
          email: normEmail,
          stream: streamKey.toUpperCase(),
          domain: 'Core Engineering & Architecture',
          experience_level: 'Fresher (0-1 yr)',
          skill_score: base_percentage,
          dynamic_competence_percent: base_percentage,
          readiness_score: base_percentage,
          skills: defaultSkills.map(s => s.name),
          created_at: new Date().toISOString()
        };
        store.candidates.push(cand);
      }
    }

    saveLocalStore(store);
    return result;
  },

  // Get Persisted Student Skill Progress (Auto-initializes if empty)
  async getStudentSkills({ user_id, user_email, stream }) {
    const p = initPool();
    let resolvedUserId = user_id;

    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id, stream FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) {
              resolvedUserId = uRes.rows[0].id;
              if (!stream && uRes.rows[0].stream) stream = uRes.rows[0].stream;
            }
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          const res = await p.query(
            \`SELECT * FROM student_skill_progress
             WHERE user_id = $1
             ORDER BY created_at ASC, skill_name ASC\`,
            [validUuid]
          );
          if (res.rows && res.rows.length > 0) {
            return res.rows;
          }

          // Auto-seed if 0 skill rows found for user
          return await this.autoSeedStudentSkills({
            user_id: validUuid,
            user_email,
            stream: stream || 'it'
          });
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentSkills notice:', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? \`usr-\${normEmail}\` : null);

    let skills = (store.student_skill_progress || []).filter(item => 
      (effectiveUserId && item.user_id === effectiveUserId) ||
      (normEmail && item.user_email && item.user_email === normEmail)
    );

    if (skills.length === 0 && (effectiveUserId || normEmail)) {
      skills = await this.autoSeedStudentSkills({
        user_id: effectiveUserId,
        user_email: normEmail,
        stream: stream || 'it'
      });
    }

    return skills;
  },`.replace(/\r?\n/g, '\r\n');

if (dbCode.includes(oldGetStudentSkills)) {
  dbCode = dbCode.replace(oldGetStudentSkills, newGetStudentSkills);
  fs.writeFileSync(dbPath, dbCode, 'utf8');
  console.log('Successfully updated getStudentSkills & added autoSeedStudentSkills in db.js');
} else {
  console.error('Failed to locate oldGetStudentSkills in db.js');
}

// 2. Update api/_handlers/tests/submit.js
const submitPath = path.join(__dirname, '..', 'api', '_handlers', 'tests', 'submit.js');
let submitCode = fs.readFileSync(submitPath, 'utf8');

const oldSubmitSection = `        // Fetch the newly updated progress summary
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
        }`.replace(/\r?\n/g, '\r\n');

const newSubmitSection = `        // Fetch the current progress summary for targeted skill
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
        }`.replace(/\r?\n/g, '\r\n');

if (submitCode.includes(oldSubmitSection)) {
  submitCode = submitCode.replace(oldSubmitSection, newSubmitSection);
  fs.writeFileSync(submitPath, submitCode, 'utf8');
  console.log('Successfully updated submit.js with incremental logic & 80% mastery cap');
} else {
  console.error('Failed to locate oldSubmitSection in submit.js');
}

// 3. Update api/_handlers/register.js
const regPath = path.join(__dirname, '..', 'api', '_handlers', 'register.js');
let regCode = fs.readFileSync(regPath, 'utf8');

const oldRegSection = `    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();`.replace(/\r?\n/g, '\r\n');

const newRegSection = `    // Auto-seed default stream skills and candidate record (No manual CSV imports needed)
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
    const pin = Math.floor(100000 + Math.random() * 900000).toString();`.replace(/\r?\n/g, '\r\n');

if (regCode.includes(oldRegSection)) {
  regCode = regCode.replace(oldRegSection, newRegSection);
  fs.writeFileSync(regPath, regCode, 'utf8');
  console.log('Successfully updated register.js to auto-seed student skills on signup');
} else {
  console.error('Failed to locate oldRegSection in register.js');
}

// 4. Update api/_handlers/student/dashboard.js
const dashPath = path.join(__dirname, '..', 'api', '_handlers', 'student', 'dashboard.js');
let dashCode = fs.readFileSync(dashPath, 'utf8');

const oldDashSection = `    const skills = await db.getStudentSkills({
      user_id,
      user_email
    });`.replace(/\r?\n/g, '\r\n');

const newDashSection = `    let skills = await db.getStudentSkills({
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
    }`.replace(/\r?\n/g, '\r\n');

if (dashCode.includes(oldDashSection)) {
  dashCode = dashCode.replace(oldDashSection, newDashSection);
  fs.writeFileSync(dashPath, dashCode, 'utf8');
  console.log('Successfully updated student/dashboard.js to auto-seed student skills if empty');
} else {
  console.error('Failed to locate oldDashSection in student/dashboard.js');
}
