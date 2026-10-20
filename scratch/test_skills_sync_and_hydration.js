// Test Suite: Persist & Hydrate Live Skill Level Breakdown & Radar Metrics from Database
const assert = require('assert');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    getHeader(k) { return this.headers[k]; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
}

async function runTests() {
  console.log('=== Starting Skill Progress Sync, Persistence & Hydration Test Suite ===');

  const db = require('../api/_handlers/db');
  const registerHandler = require('../api/_handlers/register');
  const verifyPinHandler = require('../api/_handlers/verify-pin');
  const loginHandler = require('../api/_handlers/login');
  const skillsSyncHandler = require('../api/_handlers/student/skills-sync');
  const skillsHandler = require('../api/_handlers/student/skills');
  const dashboardHandler = require('../api/_handlers/student/dashboard');
  const activityHandler = require('../api/_handlers/activity');
  const analyticsHandler = require('../api/_handlers/analytics');

  const timestamp = Date.now();
  const testEmail = `ece_student_${timestamp}@campus2career.org`;
  const testUsername = `ece_${timestamp.toString().slice(-6)}`;
  const testFullName = 'Pooja Iyer';

  // 1. Register and Verify Student
  console.log('\n--- 1. Register & Verify Student ---');
  const regReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: testFullName,
      username: testUsername,
      email: testEmail,
      password: 'StrongPassword123!',
      role: 'learner',
      stream: 'ECE'
    }
  };
  const regRes = createMockRes();
  await registerHandler(regReq, regRes);
  assert.strictEqual(regRes.statusCode, 200);

  const store = db.getLocalStore();
  const pending = store.pending_verifications.find(p => p.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(pending, 'Pending PIN must exist');

  const verifyReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail, pin: pending.pin }
  };
  const verifyRes = createMockRes();
  await verifyPinHandler(verifyReq, verifyRes);
  assert.strictEqual(verifyRes.statusCode, 200);

  const token = verifyRes.body.token;
  const user = verifyRes.body.user;
  assert.ok(token);
  console.log('✓ Student verified:', user.name, user.email, 'ID:', user.id);

  // 2. Initial state: zero records in student_skill_progress
  console.log('\n--- 2. Initial Skills Check (Should be 0 records before onboarding) ---');
  const initSkillsReq = {
    method: 'GET',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` }
  };
  const initSkillsRes = createMockRes();
  await skillsHandler(initSkillsReq, initSkillsRes);
  assert.strictEqual(initSkillsRes.statusCode, 200);
  assert.strictEqual(initSkillsRes.body.count, 0, 'New user should have 0 custom records initially');
  console.log('✓ Initial count is 0 as expected');

  // 3. Complete Onboarding Diagnostic / Skill Assessment: Sync to Database
  console.log('\n--- 3. Save Baseline Scores via POST /api/student/skills/sync ---');
  const evaluatedSkills = [
    {
      skill_id: 'emb_c',
      skill_name: 'Embedded C & RTOS',
      category: 'Firmware Architecture',
      base_percentage: 35,
      total_score: 35,
      status: 'UNVERIFIED BASELINE',
      current_milestone: 'GPIO, UART and FreeRTOS task creation',
      next_milestone: 'Bare-metal DMA queues and interrupt race conditions'
    },
    {
      skill_id: 'stm32',
      skill_name: 'Bare-Metal STM32 & ARM Cortex',
      category: 'Microcontrollers',
      base_percentage: 40,
      total_score: 40,
      status: 'UNVERIFIED BASELINE',
      current_milestone: 'Register-level timer configuration',
      next_milestone: 'Custom bootloaders and memory mapping'
    },
    {
      skill_id: 'protocols',
      skill_name: 'Hardware Protocols (SPI/I2C/CAN)',
      category: 'Bus Communication',
      base_percentage: 25,
      total_score: 25,
      status: 'UNVERIFIED BASELINE',
      current_milestone: 'Bit-banged SPI logic analyzer decoding',
      next_milestone: 'Multi-node CAN FD transceivers'
    },
    {
      skill_id: 'pcb',
      skill_name: 'KiCad & High-Speed PCB Layout',
      category: 'Hardware Design',
      base_percentage: 45,
      total_score: 45,
      status: 'UNVERIFIED BASELINE',
      current_milestone: '4-layer stackup and differential impedance',
      next_milestone: 'High-speed signal integrity and EMI shielding'
    }
  ];

  const syncReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` },
    body: {
      stream: 'ECE',
      skills: evaluatedSkills
    }
  };
  const syncRes = createMockRes();
  await skillsSyncHandler(syncReq, syncRes);
  assert.strictEqual(syncRes.statusCode, 200);
  assert.strictEqual(syncRes.body.success, true);
  assert.strictEqual(syncRes.body.count, 4, 'All 4 skills must be synced and upserted');
  console.log('✓ Successfully synced 4 evaluated skills to student_skill_progress!');

  // 4. Hydrate Persisted Skills on Login / Dashboard Initialization
  console.log('\n--- 4. Hydrate Persisted Skills via GET /api/student/skills & /dashboard ---');
  const getSkillsReq = {
    method: 'GET',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` }
  };
  const getSkillsRes = createMockRes();
  await skillsHandler(getSkillsReq, getSkillsRes);
  assert.strictEqual(getSkillsRes.statusCode, 200);
  assert.strictEqual(getSkillsRes.body.count, 4);

  const hydrated = getSkillsRes.body.skills;
  const embSkill = hydrated.find(s => s.skill_name === 'Embedded C & RTOS');
  assert.ok(embSkill, 'Embedded C must exist in hydrated skills');
  assert.strictEqual(embSkill.total_score, 35, 'Initial score must match evaluated baseline (35%)');
  assert.strictEqual(embSkill.status, 'UNVERIFIED BASELINE');
  console.log('✓ Hydrated real database skill:', embSkill.skill_name, 'Score:', embSkill.total_score + '%', 'Status:', embSkill.status);

  // Check /api/student/dashboard
  const dashReq = {
    method: 'GET',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` }
  };
  const dashRes = createMockRes();
  await dashboardHandler(dashReq, dashRes);
  assert.strictEqual(dashRes.statusCode, 200);
  assert.strictEqual(dashRes.body.skills.length, 4);
  console.log('✓ /api/student/dashboard successfully returned real student skills & analytics!');

  // 5. Wire "Take 10-MCQ Test" Update (Score: 88% -> Upgrades to 'LIVE VERIFIED')
  console.log('\n--- 5. Take 10-MCQ Test: Verify Status Upgrades to LIVE VERIFIED ---');
  const mcqReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` },
    body: {
      activity_type: 'quiz',
      topic: 'Embedded C & RTOS',
      score: 88,
      time_spent_minutes: 15,
      competence: 88
    }
  };
  const mcqRes = createMockRes();
  await activityHandler(mcqReq, mcqRes);
  assert.strictEqual(mcqRes.statusCode, 200);

  // Verify in DB that status became 'LIVE VERIFIED' and total_score became 88%
  const updatedSkills1 = await db.getStudentSkills({ user_id: user.id, user_email: testEmail });
  const embUpdated1 = updatedSkills1.find(s => s.skill_name === 'Embedded C & RTOS');
  assert.ok(embUpdated1);
  assert.strictEqual(embUpdated1.total_score, 88, 'total_score must update to 88%');
  assert.strictEqual(embUpdated1.status, 'LIVE VERIFIED', 'Status must upgrade to LIVE VERIFIED on score >= 80%');
  console.log('✓ MCQ test verified: total_score =', embUpdated1.total_score + '%, status =', embUpdated1.status);

  // 6. Wire "Study Video Playlist" Update (Lectures completed + bonus)
  console.log('\n--- 6. Study Video Playlist: Verify lectures_completed & total_score increment ---');
  const videoReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` },
    body: {
      activity_type: 'revision',
      topic: 'Bare-Metal STM32 & ARM Cortex',
      time_spent_minutes: 30,
      competence: 75
    }
  };
  const videoRes = createMockRes();
  await activityHandler(videoReq, videoRes);
  assert.strictEqual(videoRes.statusCode, 200);

  const updatedSkills2 = await db.getStudentSkills({ user_id: user.id, user_email: testEmail });
  const stmUpdated = updatedSkills2.find(s => s.skill_name.includes('STM32'));
  assert.ok(stmUpdated);
  assert.ok(stmUpdated.lectures_completed >= 1, 'lectures_completed must be incremented');
  assert.ok(stmUpdated.total_score >= 43, `total_score should increase from baseline 40% (actual: ${stmUpdated.total_score}%)`);
  console.log('✓ Video playlist verified: lectures_completed =', stmUpdated.lectures_completed, 'total_score =', stmUpdated.total_score + '%');

  // 7. Verify Radar Metrics Reflect Real DB Skills
  console.log('\n--- 7. Verify Radar Diagram Feeds Real DB Skills & Verified Scores ---');
  const analyticsReq = {
    method: 'GET',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000', authorization: `Bearer ${token}` },
    query: { stream: 'ECE' }
  };
  const analyticsRes = createMockRes();
  await analyticsHandler(analyticsReq, analyticsRes);
  assert.strictEqual(analyticsRes.statusCode, 200);

  const competencies = analyticsRes.body.skill_competencies;
  assert.ok(Array.isArray(competencies));
  const embComp = competencies.find(c => c.name.includes('Embedded C'));
  assert.ok(embComp, 'Radar diagram must include student real evaluated skill (Embedded C)');
  assert.strictEqual(embComp.score, 88, 'Radar competence must show verified score (88%)');
  assert.strictEqual(embComp.verified, true, 'Radar competence verified flag must be true');
  console.log('✓ Radar diagram competencies successfully loaded from student_skill_progress:');
  competencies.forEach(c => {
    console.log(`   - ${c.name}: ${c.score}% (verified: ${c.verified})`);
  });

  console.log('\n=== ALL SKILL PROGRESS PERSISTENCE & HYDRATION TESTS PASSED (100%)! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
