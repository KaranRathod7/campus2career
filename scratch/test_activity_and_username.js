// Test Suite for Campus2Career User Activity, Readiness Analytics, and Username Support
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
  console.log('=== Starting Activity, Analytics, and Username Test Suite ===');

  const db = require('../api/_handlers/db');
  const registerHandler = require('../api/_handlers/register');
  const verifyPinHandler = require('../api/_handlers/verify-pin');
  const loginHandler = require('../api/_handlers/login');
  const activityHandler = require('../api/_handlers/activity');
  const analyticsHandler = require('../api/_handlers/analytics');

  const timestamp = Date.now();
  const testEmail1 = `student_${timestamp}@campus2career.org`;
  const testUsername1 = `stud_${timestamp.toString().slice(-6)}`;
  const testFullName1 = 'Rohan Deshmukh';

  // -------------------------------------------------------------
  // Test 1: Username format validation & distinct separation
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Username & Name Separation ---');

  // 1.1 Invalid username (too short or invalid chars)
  const invalidReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: testFullName1,
      username: 'a!',
      email: testEmail1,
      password: 'StrongPassword123!',
      role: 'learner',
      stream: 'IT'
    }
  };
  const invalidRes = createMockRes();
  await registerHandler(invalidReq, invalidRes);
  assert.strictEqual(invalidRes.statusCode, 400, 'Should reject invalid username with 400');
  console.log('✓ Invalid username correctly rejected with 400:', invalidRes.body?.error);

  // 1.2 Valid registration with distinct Name and Username
  const validRegReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: testFullName1,
      username: testUsername1,
      email: testEmail1,
      password: 'StrongPassword123!',
      role: 'learner',
      stream: 'IT'
    }
  };
  const validRegRes = createMockRes();
  await registerHandler(validRegReq, validRegRes);
  assert.strictEqual(validRegRes.statusCode, 200, 'Valid registration should succeed');
  assert.strictEqual(validRegRes.body?.username, testUsername1, 'Response must include username');
  console.log('✓ Registration successful with username:', validRegRes.body?.username);

  // 1.3 Verify distinct columns in database / store
  const storedUser = await db.getUserByEmail(testEmail1);
  assert.ok(storedUser, 'User must exist in database');
  assert.strictEqual(storedUser.name, testFullName1, 'Stored name must match Full Name');
  assert.strictEqual(storedUser.username, testUsername1, 'Stored username must match Username');
  console.log('✓ Database verified: name =', storedUser.name, '| username =', storedUser.username);

  // 1.4 Lookup by username
  const lookedUpUser = await db.getUserByUsername(testUsername1);
  assert.ok(lookedUpUser, 'getUserByUsername should find user');
  assert.strictEqual(lookedUpUser.email, testEmail1, 'Email must match looked up user');
  console.log('✓ db.getUserByUsername lookup successful:', lookedUpUser.username);

  // 1.5 Duplicate username rejection
  const dupUserReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: 'Another Student',
      username: testUsername1,
      email: `other_${timestamp}@campus2career.org`,
      password: 'AnotherPassword123!',
      role: 'learner',
      stream: 'IT'
    }
  };
  const dupUserRes = createMockRes();
  await registerHandler(dupUserReq, dupUserRes);
  assert.strictEqual(dupUserRes.statusCode, 409, 'Duplicate username must return 409');
  assert.strictEqual(dupUserRes.body?.error, 'username_taken', 'Error code must be username_taken');
  console.log('✓ Duplicate username rejected with 409 username_taken');

  // -------------------------------------------------------------
  // Test 2: Verification and Authentication
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Verification & Auth Token Issuance ---');

  // Fetch pending verification PIN
  const store = db.getLocalStore();
  const pending = store.pending_verifications.find(p => p.email.toLowerCase() === testEmail1.toLowerCase());
  assert.ok(pending, 'Pending verification must exist');

  const verifyReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail1, pin: pending.pin }
  };
  const verifyRes = createMockRes();
  await verifyPinHandler(verifyReq, verifyRes);
  assert.strictEqual(verifyRes.statusCode, 200, 'Verification must succeed');
  assert.strictEqual(verifyRes.body?.user?.username, testUsername1, 'Verified user must include username');

  const sessionToken = verifyRes.body.token;
  assert.ok(sessionToken, 'Token must be issued');
  console.log('✓ User verified, username confirmed:', verifyRes.body.user.username);

  // -------------------------------------------------------------
  // Test 3: Persist Student Activity & Readiness Score Calculation
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Persist Activity & Readiness Calculation ---');

  // 3.1 Log a study timer activity
  const timerReq = {
    method: 'POST',
    headers: {
      origin: 'http://localhost:8000',
      host: 'localhost:8000',
      authorization: `Bearer ${sessionToken}`
    },
    body: {
      activity_type: 'timer',
      topic: 'Data Structures & Algorithms',
      time_spent_minutes: 45,
      competence: 70
    }
  };
  const timerRes = createMockRes();
  await activityHandler(timerReq, timerRes);
  assert.strictEqual(timerRes.statusCode, 200, 'Activity timer logging should succeed');
  assert.strictEqual(timerRes.body?.success, true);
  console.log('✓ Logged timer activity:', timerRes.body?.activity?.topic, 'Readiness:', timerRes.body?.readiness_score);

  // 3.2 Log an exam / quiz activity with a high score
  const quizReq = {
    method: 'POST',
    headers: {
      origin: 'http://localhost:8000',
      host: 'localhost:8000',
      authorization: `Bearer ${sessionToken}`
    },
    body: {
      activity_type: 'quiz',
      topic: 'Database Systems & SQL',
      score: 92,
      time_spent_minutes: 20,
      competence: 92
    }
  };
  const quizRes = createMockRes();
  await activityHandler(quizReq, quizRes);
  assert.strictEqual(quizRes.statusCode, 200, 'Activity quiz logging should succeed');
  assert.strictEqual(quizRes.body?.success, true);
  console.log('✓ Logged quiz activity: score =', quizRes.body?.activity?.score, 'Readiness:', quizRes.body?.readiness_score);

  // 3.3 Log a revision / milestone activity
  const revReq = {
    method: 'POST',
    headers: {
      origin: 'http://localhost:8000',
      host: 'localhost:8000',
      authorization: `Bearer ${sessionToken}`
    },
    body: {
      activity_type: 'revision',
      topic: 'Web Dev & Full-Stack',
      score: 88,
      time_spent_minutes: 30,
      competence: 88
    }
  };
  const revRes = createMockRes();
  await activityHandler(revReq, revRes);
  assert.strictEqual(revRes.statusCode, 200, 'Activity revision logging should succeed');
  console.log('✓ Logged revision activity. New readiness score:', revRes.body?.readiness_score);

  // -------------------------------------------------------------
  // Test 4: Retrieve Analytics for Radar Chart
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Real DB Analytics for Radar Diagram ---');

  const analyticsReq = {
    method: 'GET',
    headers: {
      origin: 'http://localhost:8000',
      host: 'localhost:8000',
      authorization: `Bearer ${sessionToken}`
    },
    query: { stream: 'IT' }
  };
  const analyticsRes = createMockRes();
  await analyticsHandler(analyticsReq, analyticsRes);
  assert.strictEqual(analyticsRes.statusCode, 200, 'Analytics endpoint should return 200');
  
  const analytics = analyticsRes.body;
  assert.strictEqual(analytics.success, true);
  assert.ok(analytics.study_hours >= 1.5, `Study hours should be >= 1.5 (actual: ${analytics.study_hours})`);
  assert.strictEqual(analytics.completed_topics, 3, 'Should have 3 distinct completed topics');
  assert.ok(Array.isArray(analytics.skill_competencies), 'Should return skill_competencies array');
  assert.strictEqual(analytics.skill_competencies.length, 5, 'IT stream should return 5 radar disciplines');

  console.log('✓ Aggregated Study Hours:', analytics.study_hours);
  console.log('✓ Completed Topics Count:', analytics.completed_topics);
  console.log('✓ Readiness Score:', analytics.readiness_score);
  console.log('✓ Skill Competencies:');
  analytics.skill_competencies.forEach(c => {
    console.log(`   - ${c.name}: ${c.score}% (verified: ${c.verified})`);
  });

  const dsaComp = analytics.skill_competencies.find(c => c.name.includes('Data Structures'));
  assert.ok(dsaComp, 'DSA discipline must be present in radar competencies');
  assert.strictEqual(dsaComp.verified, true, 'DSA should be verified from logged activity');

  const sqlComp = analytics.skill_competencies.find(c => c.name.includes('Database Systems'));
  assert.ok(sqlComp, 'SQL discipline must be present');
  assert.strictEqual(sqlComp.verified, true, 'SQL should be verified from logged activity');
  assert.strictEqual(sqlComp.score, 92, 'SQL score should reflect recorded quiz score (92%)');

  console.log('\n=== All Tests Passed Successfully! ===');
}

runTests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
