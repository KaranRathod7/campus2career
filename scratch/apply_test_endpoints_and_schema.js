const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'api', '_handlers', 'db.js');
const localStorePath = path.join(__dirname, '..', 'local_pg_store.json');

let dbJs = fs.readFileSync(dbPath, 'utf8');

console.log('--- 1. Cleaning local_pg_store.json ---');
if (fs.existsSync(localStorePath)) {
  try {
    const store = JSON.parse(fs.readFileSync(localStorePath, 'utf8'));
    delete store.student_activity_logs;
    if (!store.student_test_attempts) store.student_test_attempts = [];
    fs.writeFileSync(localStorePath, JSON.stringify(store, null, 2), 'utf8');
    console.log('✓ Cleaned local_pg_store.json: dropped student_activity_logs, added student_test_attempts');
  } catch (e) {
    console.error('Error updating local_pg_store.json:', e);
  }
}

console.log('--- 2. Updating getLocalStore in db.js ---');
// Ensure getLocalStore purges student_activity_logs and ensures student_test_attempts
const oldGetLocal = `function getLocalStore() {
  if (inMemoryStore) {`;

const newGetLocal = `function getLocalStore() {
  if (inMemoryStore) {
    delete inMemoryStore.student_activity_logs;
    if (!inMemoryStore.student_test_attempts) inMemoryStore.student_test_attempts = [];`;

if (dbJs.includes(oldGetLocal) && !dbJs.includes('delete inMemoryStore.student_activity_logs')) {
  dbJs = dbJs.replace(oldGetLocal, newGetLocal);
  console.log('✓ Updated getLocalStore in-memory check to purge student_activity_logs');
}

// In the disk read fallback of getLocalStore:
const oldDiskParse = `      inMemoryStore = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));`;
const newDiskParse = `      inMemoryStore = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
      delete inMemoryStore.student_activity_logs;
      if (!inMemoryStore.student_test_attempts) inMemoryStore.student_test_attempts = [];`;

if (dbJs.includes(oldDiskParse) && !dbJs.includes('delete inMemoryStore.student_activity_logs;')) {
  dbJs = dbJs.replace(oldDiskParse, newDiskParse);
  console.log('✓ Updated getLocalStore disk read to purge student_activity_logs');
}

console.log('--- 3. Injecting DB Methods into const db = { ... } ---');
const dbMethodsHook = `  // Record Student Study Activity & Update Readiness Score in Candidates Table`;

const methodsToInject = `  // Supabase SDK Client Factory
  getSupabaseClient() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        return createClient(url, key);
      } catch (e) {
        console.warn('[Campus2Career Supabase Client Load Warning]', e.message);
      }
    }
    return null;
  },

  // Record student test attempt in student_test_attempts and update student_skill_progress
  async recordTestAttempt({ user_id, skill_name, test_title, score, total_questions, correct_answers, metadata }) {
    const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const cleanSkill = (skill_name || 'Core Skill').trim();
    const cleanTitle = (test_title || \`\${cleanSkill} Assessment\`).trim();
    const numScore = Math.min(100, Math.max(0, Number(score) || 0));
    const totalQ = Math.max(0, Number(total_questions) || 0);
    const correctA = Math.max(0, Number(correct_answers) || 0);
    const metaObj = (metadata && typeof metadata === 'object') ? metadata : {};

    const p = initPool();
    let attempt = null;
    let summary = null;

    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          \`INSERT INTO student_test_attempts (user_id, skill_name, test_title, score, total_questions, correct_answers, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *\`,
          [validUuid, cleanSkill, cleanTitle, numScore, totalQ, correctA, JSON.stringify(metaObj)]
        );
        attempt = res.rows[0];

        // Fetch updated progress summary from student_skill_progress
        const progRes = await p.query(
          \`SELECT * FROM student_skill_progress
           WHERE (user_id = $1 OR user_id::text = $2) AND LOWER(skill_name) = LOWER($3)
           LIMIT 1\`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id), cleanSkill]
        );
        if (progRes.rows && progRes.rows[0]) {
          summary = progRes.rows[0];
        } else {
          // If trigger didn't catch or row wasn't present, upsert manually
          const isVerified = numScore >= 80;
          const statusStr = isVerified ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE';
          const upRes = await p.query(
            \`INSERT INTO student_skill_progress (user_id, skill_name, category, base_percentage, total_score, status, verified, last_tested_at)
             VALUES ($1, $2, 'Core Skill', 35, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, skill_name) DO UPDATE SET
               total_score = EXCLUDED.total_score,
               status = EXCLUDED.status,
               verified = EXCLUDED.verified,
               last_tested_at = CURRENT_TIMESTAMP
             RETURNING *\`,
            [validUuid, cleanSkill, numScore, statusStr, isVerified]
          );
          summary = upRes.rows[0];
        }

        return { attempt, summary };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordTestAttempt notice (falling back to local):', err.message);
      }
    }

    // In-Memory / Local Store Fallback
    const store = getLocalStore();
    if (!store.student_test_attempts) store.student_test_attempts = [];
    if (!store.student_skill_progress) store.student_skill_progress = [];

    attempt = {
      id: \`attempt-\${Date.now()}-\${Math.floor(Math.random()*1000)}\`,
      user_id: user_id || 'anonymous',
      skill_name: cleanSkill,
      test_title: cleanTitle,
      score: numScore,
      total_questions: totalQ,
      correct_answers: correctA,
      metadata: metaObj,
      created_at: new Date().toISOString()
    };
    store.student_test_attempts.push(attempt);

    // Update / upsert local skill progress
    let skillProg = store.student_skill_progress.find(s => 
      ((user_id && s.user_id === user_id) || (s.user_id === attempt.user_id)) && 
      s.skill_name.toLowerCase() === cleanSkill.toLowerCase()
    );

    const isVerified = numScore >= 80;
    const statusStr = isVerified ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE';

    if (skillProg) {
      skillProg.total_score = isVerified ? Math.max(skillProg.total_score || 35, numScore) : (skillProg.total_score || 35);
      skillProg.status = isVerified ? 'LIVE VERIFIED' : (skillProg.status || statusStr);
      skillProg.verified = isVerified || Boolean(skillProg.verified);
      skillProg.last_tested_at = attempt.created_at;
      skillProg.updated_at = new Date().toISOString();
      summary = skillProg;
    } else {
      summary = {
        id: \`ssp-\${Date.now()}\`,
        user_id: user_id || 'anonymous',
        skill_name: cleanSkill,
        category: 'Core Skill',
        base_percentage: 35,
        total_score: numScore,
        status: statusStr,
        verified: isVerified,
        last_tested_at: attempt.created_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.student_skill_progress.push(summary);
    }

    saveLocalStore(store);
    return { attempt, summary };
  },

  // Get test attempts timeline for analytics
  async getStudentTestAttempts(user_id) {
    const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          \`SELECT skill_name, test_title, score, created_at
           FROM student_test_attempts
           WHERE user_id = $1 OR user_id::text = $2
           ORDER BY created_at ASC\`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
        );
        return res.rows || [];
      } catch (e) {
        console.warn('[Campus2Career DB] getStudentTestAttempts fallback:', e.message);
      }
    }
    const store = getLocalStore();
    return (store.student_test_attempts || [])
      .filter(a => user_id && (a.user_id === user_id || String(a.user_id) === String(user_id)))
      .map(a => ({
        skill_name: a.skill_name,
        test_title: a.test_title,
        score: a.score,
        created_at: a.created_at
      }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // Get skill progress overview for analytics
  async getStudentSkillProgress(user_id) {
    const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          \`SELECT * FROM student_skill_progress
           WHERE user_id = $1 OR user_id::text = $2
           ORDER BY skill_name ASC\`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
        );
        return res.rows || [];
      } catch (e) {
        console.warn('[Campus2Career DB] getStudentSkillProgress fallback:', e.message);
      }
    }
    const store = getLocalStore();
    return (store.student_skill_progress || [])
      .filter(s => user_id && (s.user_id === user_id || String(s.user_id) === String(user_id)));
  },

  // Record Student Study Activity & Update Readiness Score in Candidates Table`;

if (!dbJs.includes('recordTestAttempt')) {
  dbJs = dbJs.replace(dbMethodsHook, methodsToInject);
  console.log('✓ Successfully injected recordTestAttempt, getStudentTestAttempts, getStudentSkillProgress into db.js');
}

fs.writeFileSync(dbPath, dbJs, 'utf8');
console.log('✓ Saved db.js successfully!');
