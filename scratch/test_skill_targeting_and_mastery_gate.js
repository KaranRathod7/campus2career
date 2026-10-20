const assert = require('assert');
const db = require('../api/_handlers/db');

async function runTests() {
  console.log('=== STARTING TEST SUITE: STRICT TARGETING & 80% MASTERY GATE ===\n');

  const testUserId = `test-user-${Date.now()}`;
  const testEmail = `student_${Date.now()}@campus2career.org`;

  // TEST 1: Auto-seeding verification (Elimination of CSV import dependencies)
  console.log('--- Test 1: Auto-Seeding on Fresh User ---');
  const seededSkills = await db.getStudentSkills({
    user_id: testUserId,
    user_email: testEmail,
    stream: 'IT'
  });

  assert.strictEqual(Array.isArray(seededSkills), true, 'Seeded skills must be an array');
  assert.strictEqual(seededSkills.length, 5, 'Must seed exactly 5 default skills for IT stream');
  const skillNames = seededSkills.map(s => s.skill_name);
  assert.ok(skillNames.includes('Docker & Containers'), 'Must contain Docker & Containers');
  assert.ok(skillNames.includes('Production Debugging'), 'Must contain Production Debugging');
  assert.ok(skillNames.includes('Java & Multithreading'), 'Must contain Java & Multithreading');

  // Verify initial baseline scores
  seededSkills.forEach(s => {
    assert.strictEqual(Number(s.base_percentage), 35, 'Base percentage should default to 35');
    assert.strictEqual(Number(s.total_score), 35, 'Total score should default to 35');
    assert.strictEqual(Number(s.diagnostic_score || 0), 0, 'Diagnostic score should default to 0');
    assert.strictEqual(s.status, 'UNVERIFIED BASELINE', 'Initial status must be UNVERIFIED BASELINE');
  });
  console.log('✔ PASS: Auto-seeding populated 5 default skills with 35% baseline without CSV import.');

  // TEST 2: Strict Skill Targeting on Test Submission
  console.log('\n--- Test 2: Strict Target Skill Targeting on Test Submission ---');
  const dockerTestRes = await db.recordTestAttempt({
    user_id: testUserId,
    skill_name: 'Docker & Containers',
    test_title: 'Docker & Containerization Assessment',
    score: 100,
    total_questions: 10,
    correct_answers: 10
  });

  assert.strictEqual(dockerTestRes.attempt.skill_name, 'Docker & Containers', 'Attempt must record Docker & Containers');
  assert.strictEqual(dockerTestRes.summary.skill_name, 'Docker & Containers', 'Summary must be for Docker & Containers');
  assert.strictEqual(Number(dockerTestRes.summary.diagnostic_score), 5, '100% score awards +5% incremental diagnostic gain');
  assert.strictEqual(Number(dockerTestRes.summary.total_score), 40, 'Total score is 35 (base) + 5 (diagnostic) = 40%');

  // Verify that Production Debugging was NOT touched
  const allSkillsAfterDocker = await db.getStudentSkills({
    user_id: testUserId,
    user_email: testEmail
  });
  const debugSkill = allSkillsAfterDocker.find(s => s.skill_name.toLowerCase().includes('debugging'));
  assert.ok(debugSkill, 'Production Debugging skill must exist');
  assert.strictEqual(Number(debugSkill.total_score), 35, 'Production Debugging total_score must remain 35% (UNTOUCHED)');
  assert.strictEqual(Number(debugSkill.diagnostic_score || 0), 0, 'Production Debugging diagnostic_score must remain 0%');
  console.log('✔ PASS: Docker exam ONLY updated Docker (+5% diagnostic, total 40%). Production Debugging remained at 35% untouched!');

  // TEST 3: Incremental Exam Progression Across Attempts
  console.log('\n--- Test 3: Incremental Exam Progression Across Multiple Attempts ---');
  const secondAttempt = await db.recordTestAttempt({
    user_id: testUserId,
    skill_name: 'Docker & Containers',
    test_title: 'Docker Advanced Optimization',
    score: 80,
    total_questions: 10,
    correct_answers: 8
  });
  // 80% awards +4% gain -> 5 + 4 = 9%
  assert.strictEqual(Number(secondAttempt.summary.diagnostic_score), 9, 'Second attempt at 80% adds +4% -> diagnostic is 9%');
  assert.strictEqual(Number(secondAttempt.summary.total_score), 44, 'Total score is 35 (base) + 9 (diagnostic) = 44%');
  console.log('✔ PASS: Second exam at 80% added +4% incrementally (diagnostic: 9%, total: 44%).');

  // TEST 4: 80% Total Mastery Gate Enforcement
  console.log('\n--- Test 4: 80% Total Mastery Gate Enforcement ---');
  // Simulate high accumulated progress: base 35, lectures 15, marathon 3, diagnostic accumulated to 30
  // rawTotal = 35 + 15 + 3 + 30 = 83%
  const store = db.getLocalStore ? db.getLocalStore() : null;
  if (store && store.student_skill_progress) {
    const docSkill = store.student_skill_progress.find(s => s.user_id === testUserId && s.skill_name === 'Docker & Containers');
    if (docSkill) {
      docSkill.lecture_score = 15;
      docSkill.marathon_score = 3;
      docSkill.diagnostic_score = 26; // 35 + 15 + 3 + 26 = 79%
    }
  }

  // Attempt scoring 80% (gain +4% -> diagnostic becomes 30%, rawTotal = 83%)
  const attemptCapped = await db.recordTestAttempt({
    user_id: testUserId,
    skill_name: 'Docker & Containers',
    test_title: 'Docker Masterclass Gate Test',
    score: 80, // NOT 100%
    total_questions: 10,
    correct_answers: 8
  });

  assert.strictEqual(Number(attemptCapped.summary.total_score), 80, 'Score must be strictly capped at 80% when latest exam is < 100%');
  assert.ok(attemptCapped.summary.status.includes('80% CAP'), 'Status must indicate 80% CAP');
  console.log(`✔ PASS: 80% Mastery Gate active: total_score capped at 80% with status: "${attemptCapped.summary.status}".`);

  // Now student scores a perfect 100% on the benchmark
  console.log('\n--- Test 5: Unlocking 80% Mastery Gate with 100% Benchmark Score ---');
  const attemptUnlocked = await db.recordTestAttempt({
    user_id: testUserId,
    skill_name: 'Docker & Containers',
    test_title: 'Docker Masterclass Benchmark (100% Score)',
    score: 100, // 100% unlocks the gate!
    total_questions: 10,
    correct_answers: 10
  });

  // rawTotal was 83 + 5 (gain) = 87 (capped at 34 max diagnostic -> 35 + 15 + 3 + 34 = 87)
  assert.ok(Number(attemptUnlocked.summary.total_score) > 80, `Total score (${attemptUnlocked.summary.total_score}%) must unlock beyond 80% on 100% benchmark score`);
  assert.strictEqual(attemptUnlocked.summary.status, 'LIVE VERIFIED', 'Status must be LIVE VERIFIED after scoring 100%');
  console.log(`✔ PASS: Perfect 100% benchmark unlocked master tier! Total score is now ${attemptUnlocked.summary.total_score}% with status: "${attemptUnlocked.summary.status}".`);

  console.log('\n======================================================');
  console.log(' ALL 5 TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
