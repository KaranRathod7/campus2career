const assert = require('assert');
const http = require('http');
const app = require('../api/index');
const db = require('../api/_handlers/db');

console.log('================================================================');
console.log(' TEST SUITE: STUDENT TEST ATTEMPTS & ANALYTICS PIPELINE        ');
console.log('================================================================\n');

let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

let passed = 0;
let total = 0;
async function test(desc, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
  }
}

(async () => {
  await startServer();

  const testUserId = `usr-${Date.now()}`;
  const skillName = 'Java & Multithreading';

  console.log('\n--- 1. Validation & Error Handling on POST /api/tests/submit ---');
  await test('Rejects submission with missing userId or skillName or score (400)', async () => {
    const res = await request('/api/tests/submit', {
      method: 'POST',
      body: { testTitle: 'Missing fields' }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.error, 'Expected error message');
  });

  console.log('\n--- 2. Record First Test Attempt: Score = 60% (Unverified Baseline) ---');
  let firstAttempt;
  await test('Records first test attempt in student_test_attempts and updates student_skill_progress', async () => {
    const res = await request('/api/tests/submit', {
      method: 'POST',
      body: {
        userId: testUserId,
        skillName,
        testTitle: 'Java Core Diagnostic Test 1',
        score: 60,
        totalQuestions: 10,
        correctAnswers: 6,
        breakdown: { mode: 10, category: 'Core Language' }
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.attempt, 'Expected attempt record');
    assert.strictEqual(res.data.attempt.skill_name, skillName);
    assert.strictEqual(Number(res.data.attempt.score), 60);

    assert(res.data.summary, 'Expected updated summary');
    assert.strictEqual(res.data.summary.skill_name, skillName);
    firstAttempt = res.data.attempt;
  });

  console.log('\n--- 3. Record Second Test Attempt: Score = 90% (Level Up to LIVE VERIFIED) ---');
  let secondAttempt;
  await test('Records second test attempt and elevates progress summary to LIVE VERIFIED', async () => {
    const res = await request('/api/tests/submit', {
      method: 'POST',
      body: {
        userId: testUserId,
        skillName,
        testTitle: 'Java Production Architecture Benchmark',
        score: 90,
        totalQuestions: 10,
        correctAnswers: 9,
        breakdown: { mode: 10, category: 'Multithreading & Concurrency' }
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.attempt, 'Expected second attempt record');
    assert.strictEqual(Number(res.data.attempt.score), 90);

    assert(res.data.summary, 'Expected updated summary');
    assert.strictEqual(res.data.summary.status, 'LIVE VERIFIED');
    assert.strictEqual(Number(res.data.summary.total_score), 90);
    assert(res.data.summary.verified, 'Expected verified: true');
    secondAttempt = res.data.attempt;
  });

  console.log('\n--- 4. Query Analytics Endpoint: GET /api/student/analytics?userId=... ---');
  await test('Returns skills summary and timeline of attempts for line charts', async () => {
    const res = await request(`/api/student/analytics?userId=${testUserId}`);
    assert.strictEqual(res.status, 200);

    // Verify requested contract: { skills, timeline }
    assert(Array.isArray(res.data.skills), 'Expected skills array in response');
    assert(Array.isArray(res.data.timeline), 'Expected timeline array in response');

    // Verify timeline contains both attempts ordered by created_at
    assert.strictEqual(res.data.timeline.length, 2);
    assert.strictEqual(Number(res.data.timeline[0].score), 60);
    assert.strictEqual(Number(res.data.timeline[1].score), 90);
    assert.strictEqual(res.data.timeline[0].skill_name, skillName);
    assert.strictEqual(res.data.timeline[1].skill_name, skillName);

    // Verify skills overview contains the active skill
    const skillItem = res.data.skills.find(s => s.name === skillName || s.skill_name === skillName);
    assert(skillItem, 'Expected Java skill in overview');
    const scoreVal = Number(skillItem.score || skillItem.total_score);
    assert.strictEqual(scoreVal, 90);
  });

  console.log('\n--- 5. Supabase & DB Table Consolidation Verification ---');
  await test('Deprecated table student_activity_logs is dropped/removed from schema & store', async () => {
    const store = db.getLocalStore ? db.getLocalStore() : null;
    if (store) {
      assert.strictEqual(store.student_activity_logs, undefined, 'student_activity_logs must not exist in store');
    }
  });

  await test('student_test_attempts table exists in store with created attempts', async () => {
    const attempts = await db.getStudentTestAttempts(testUserId);
    assert(Array.isArray(attempts));
    assert.strictEqual(attempts.length, 2);
    assert.strictEqual(Number(attempts[0].score), 60);
    assert.strictEqual(Number(attempts[1].score), 90);
  });

  await stopServer();

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
})();
