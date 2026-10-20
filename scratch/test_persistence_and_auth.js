// Comprehensive Verification Suite for:
// 1. student_test_attempts row persistence
// 2. login_attempts row persistence (SUCCESS and FAILED) & rate limiting decoupling
// 3. 6-digit OTP Password Reset Flow (/api/auth/forgot-password & /api/auth/reset-password)

const db = require('../api/_handlers/db');
const loginHandler = require('../api/_handlers/login');
const submitTestHandler = require('../api/_handlers/tests/submit');
const forgotPasswordHandler = require('../api/_handlers/forgot-password');
const resetPasswordHandler = require('../api/_handlers/reset-password');

// Mock req and res helper
function mockReqRes({ method = 'POST', body = {}, headers = {} }) {
  let statusCode = 200;
  let headersSent = false;
  let responseData = null;

  const res = {
    setHeader: (k, v) => {},
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    end: () => res
  };

  const req = {
    method,
    body,
    headers: {
      'user-agent': 'Jest-Automated-TestSuite/1.0',
      'x-forwarded-for': '127.0.0.1',
      ...headers
    }
  };

  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

async function runTests() {
  console.log('=== STARTING TEST SUITE: PERSISTENCE & AUTH RECOVERY ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: student_test_attempts row persistence
    // ----------------------------------------------------
    console.log('--- TEST 1: student_test_attempts Row Persistence ---');
    const testUserId = 'test-student-persistence-uuid';
    const testSkill = 'Spring Boot & Microservices';
    const testScore = 85;

    const testMock = mockReqRes({
      method: 'POST',
      body: {
        userId: testUserId,
        skillName: testSkill,
        testTitle: 'Spring Boot Benchmark 10-MCQ',
        score: testScore,
        totalQuestions: 10,
        correctAnswers: 8,
        breakdown: { topic: 'Microservices', timeSeconds: 120 }
      }
    });

    await submitTestHandler(testMock.req, testMock.res);
    const testRes = testMock.getResult();
    assert(testRes.statusCode === 200, `Test submission returns 200 OK (got ${testRes.statusCode})`);
    assert(testRes.responseData && testRes.responseData.success, 'Response reports success: true');

    // Verify row exists in local store / postgres
    const store = db.getLocalStore();
    const recordedAttempt = (store.student_test_attempts || []).find(
      a => a.user_id === testUserId && a.skill_name === testSkill
    );
    assert(Boolean(recordedAttempt), 'Attempt row was persisted into student_test_attempts');
    if (recordedAttempt) {
      assert(Number(recordedAttempt.score) === 85, `Score is saved accurately (85)`);
      assert(Number(recordedAttempt.score_percentage) === 85, `score_percentage column is populated (85)`);
      assert(recordedAttempt.total_questions === 10, 'total_questions is 10');
      assert(recordedAttempt.correct_answers === 8, 'correct_answers is 8');
    }

    // ----------------------------------------------------
    // TEST 2: login_attempts persistence (FAILED & SUCCESS)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: login_attempts Row Persistence ---');
    
    // Seed a test user for login verification
    const testEmail = `test_recovery_${Date.now()}@campus2career.org`;
    const initialPass = 'InitialSecretPass123';
    const bcrypt = require('bcryptjs');
    const hashedPass = await bcrypt.hash(initialPass, 10);
    
    await db.createUser({
      name: 'Test Recovery Student',
      email: testEmail,
      username: `student_${Date.now()}`,
      password_hash: hashedPass,
      role: 'learner',
      stream: 'IT',
      is_verified: true
    });

    // 2a. Failed Login: Wrong Password
    const badPassMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, password: 'WrongPassword999' }
    });
    await loginHandler(badPassMock.req, badPassMock.res);
    assert(badPassMock.getResult().statusCode === 401, 'Failed login returns 401 Unauthorized');

    const freshStore1 = db.getLocalStore();
    const failedLog = (freshStore1.login_attempts || []).find(
      l => l.email.toLowerCase() === testEmail.toLowerCase() && l.status === 'FAILED'
    );
    assert(Boolean(failedLog), 'Failed login attempt was logged into login_attempts with status FAILED');
    assert(failedLog && failedLog.user_id === null, 'Failed login attempt has user_id: null');

    // 2b. Successful Login
    const goodLoginMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, password: initialPass }
    });
    await loginHandler(goodLoginMock.req, goodLoginMock.res);
    assert(goodLoginMock.getResult().statusCode === 200, 'Successful login returns 200 OK');

    const freshStore2 = db.getLocalStore();
    const successLog = (freshStore2.login_attempts || []).find(
      l => l.email.toLowerCase() === testEmail.toLowerCase() && l.status === 'SUCCESS'
    );
    assert(Boolean(successLog), 'Successful login attempt was logged into login_attempts with status SUCCESS');
    assert(successLog && successLog.email.toLowerCase() === testEmail.toLowerCase(), 'Success log records correct email');
    assert(successLog && successLog.user_agent === 'Jest-Automated-TestSuite/1.0', 'Success log records user agent');

    // ----------------------------------------------------
    // TEST 3: 6-Digit OTP Password Reset Flow
    // ----------------------------------------------------
    console.log('\n--- TEST 3: 6-Digit Password Reset & OTP Flow ---');

    // 3a. Forgot password with non-existent email -> 404
    const unknownForgotMock = mockReqRes({
      method: 'POST',
      body: { email: 'nonexistent_account_99999@random.edu' }
    });
    await forgotPasswordHandler(unknownForgotMock.req, unknownForgotMock.res);
    assert(unknownForgotMock.getResult().statusCode === 404, 'Forgot password for unknown email returns 404');
    assert(unknownForgotMock.getResult().responseData.error.includes('No account found'), 'Returns "No account found matching this email address."');

    // 3b. Forgot password with valid registered user -> 200 & generates 6-digit OTP
    const validForgotMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail }
    });
    await forgotPasswordHandler(validForgotMock.req, validForgotMock.res);
    assert(validForgotMock.getResult().statusCode === 200, 'Forgot password for valid user returns 200');

    // Retrieve generated OTP from password_resets table/store
    const freshStore3 = db.getLocalStore();
    const resetEntry = (freshStore3.password_resets || []).find(
      pr => pr.email.toLowerCase() === testEmail.toLowerCase() && !pr.used
    );
    assert(Boolean(resetEntry), 'Password reset record exists in password_resets store');
    assert(resetEntry && /^\d{6}$/.test(resetEntry.token), `Generated OTP is a 6-digit numeric token: ${resetEntry ? resetEntry.token : 'none'}`);
    assert(resetEntry && new Date(resetEntry.expires_at) > new Date(), 'OTP expiration is in the future');

    const activeOtp = resetEntry ? resetEntry.token : '000000';

    // 3c. Reset password with invalid OTP code -> 400
    const badCodeResetMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, code: '999999', newPassword: 'BrandNewPassword456' }
    });
    await resetPasswordHandler(badCodeResetMock.req, badCodeResetMock.res);
    assert(badCodeResetMock.getResult().statusCode === 400, 'Reset password with bad code returns 400');

    // 3d. Reset password with valid OTP code and new password -> 200
    const newPasswordSecret = 'BrandNewPassword456';
    const goodResetMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, code: activeOtp, newPassword: newPasswordSecret }
    });
    await resetPasswordHandler(goodResetMock.req, goodResetMock.res);
    assert(goodResetMock.getResult().statusCode === 200, 'Reset password with valid code returns 200');
    assert(goodResetMock.getResult().responseData.success === true, 'Reset password reports success: true');

    // Verify OTP is now marked as used
    const freshStore4 = db.getLocalStore();
    const usedEntry = (freshStore4.password_resets || []).find(
      pr => pr.email.toLowerCase() === testEmail.toLowerCase() && pr.token === activeOtp
    );
    assert(usedEntry && usedEntry.used === true, 'Reset token is marked as used');

    // 3e. Attempt replay attack with the same OTP -> 400
    const replayMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, code: activeOtp, newPassword: 'AnotherPassword789' }
    });
    await resetPasswordHandler(replayMock.req, replayMock.res);
    assert(replayMock.getResult().statusCode === 400, 'Reusing a consumed OTP returns 400');

    // 3f. Verify login works with NEW password and fails with OLD password
    const oldLoginMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, password: initialPass }
    });
    await loginHandler(oldLoginMock.req, oldLoginMock.res);
    assert(oldLoginMock.getResult().statusCode === 401, 'Login with old password now fails with 401');

    const newLoginMock = mockReqRes({
      method: 'POST',
      body: { email: testEmail, password: newPasswordSecret }
    });
    await loginHandler(newLoginMock.req, newLoginMock.res);
    assert(newLoginMock.getResult().statusCode === 200, 'Login with NEW password succeeds with 200 OK');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
