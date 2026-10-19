// Test Suite for Campus2Career Registration, Verification, and Login DB Flows
const assert = require('assert');

// Mock response helper
function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
}

async function runTests() {
  console.log('--- Starting Campus2Career Auth & DB Pipeline Tests ---');

  // Test 1: db.js offline fallback behavior vs production error throwing
  const db = require('../api/_handlers/db');
  const registerHandler = require('../api/_handlers/register');
  const verifyPinHandler = require('../api/_handlers/verify-pin');
  const loginHandler = require('../api/_handlers/login');

  // 1.1 Local development mode: registration should insert user and pending verification
  const testEmail = `test_${Date.now()}@example.com`;
  const regReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: 'Test Student',
      email: testEmail,
      password: 'SecurePassword123!',
      role: 'learner',
      stream: 'IT'
    }
  };
  const regRes = createMockRes();
  await registerHandler(regReq, regRes);

  console.log('1.1 Register Response Status:', regRes.statusCode, regRes.body?.success ? 'SUCCESS' : regRes.body?.error);
  assert.strictEqual(regRes.statusCode, 200, 'Registration should return 200 in dev mode');
  assert.strictEqual(regRes.body.success, true, 'Registration body should have success: true');

  // 1.2 Check user exists in store unverified
  const unverifiedUser = await db.getUserByEmail(testEmail);
  assert.ok(unverifiedUser, 'User must exist in db/store');
  assert.strictEqual(unverifiedUser.is_verified, false, 'User must be initially unverified');
  console.log('1.2 User successfully created as unverified:', unverifiedUser.email);

  // 1.3 Attempt login before verification (must fail with 403 needs_verification)
  const loginPreReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail, password: 'SecurePassword123!' }
  };
  const loginPreRes = createMockRes();
  await loginHandler(loginPreReq, loginPreRes);
  console.log('1.3 Pre-verification Login Status:', loginPreRes.statusCode);
  assert.strictEqual(loginPreRes.statusCode, 403, 'Login before verification must return 403');
  assert.strictEqual(loginPreRes.body.needs_verification, true);

  // 1.4 Get pending verification PIN
  const store = db.getLocalStore();
  const pending = store.pending_verifications.find(p => p.email.toLowerCase() === testEmail.toLowerCase());
  assert.ok(pending, 'Pending verification record must exist');
  console.log('1.4 Found generated PIN:', pending.pin);

  // 1.5 Verify with wrong PIN (must return 400)
  const verifyWrongReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail, pin: '000000' }
  };
  const verifyWrongRes = createMockRes();
  await verifyPinHandler(verifyWrongReq, verifyWrongRes);
  console.log('1.5 Wrong PIN Status:', verifyWrongRes.statusCode, verifyWrongRes.body?.error);
  assert.strictEqual(verifyWrongRes.statusCode, 400);

  // 1.6 Verify with correct PIN (must succeed and mark user verified)
  const verifyCorrectReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail, pin: pending.pin }
  };
  const verifyCorrectRes = createMockRes();
  await verifyPinHandler(verifyCorrectReq, verifyCorrectRes);
  console.log('1.6 Correct PIN Status:', verifyCorrectRes.statusCode);
  assert.strictEqual(verifyCorrectRes.statusCode, 200);
  assert.strictEqual(verifyCorrectRes.body.success, true);
  assert.strictEqual(verifyCorrectRes.body.user.is_verified, true);

  // 1.7 Attempt login after verification (must succeed with 200)
  const loginPostReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: { email: testEmail, password: 'SecurePassword123!' }
  };
  const loginPostRes = createMockRes();
  await loginHandler(loginPostReq, loginPostRes);
  console.log('1.7 Post-verification Login Status:', loginPostRes.statusCode);
  assert.strictEqual(loginPostRes.statusCode, 200);
  assert.strictEqual(loginPostRes.body.success, true);
  assert.strictEqual(loginPostRes.body.user.email, testEmail);

  // 2. Production / Vercel error handling test:
  // When process.env.VERCEL is set and no DB pool exists, registration must return HTTP 500 and NOT { success: true }
  process.env.VERCEL = '1';
  try {
    const prodFailReq = {
      method: 'POST',
      headers: { origin: 'http://localhost:8000' },
      body: {
        name: 'Fail User',
        email: `fail_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'learner'
      }
    };
    const prodFailRes = createMockRes();
    await registerHandler(prodFailReq, prodFailRes);
    console.log('2.1 Vercel missing-pool registration status:', prodFailRes.statusCode, prodFailRes.body);
    assert.strictEqual(prodFailRes.statusCode, 500, 'Must return 500 when database connection is unavailable in Vercel');
    assert.strictEqual(prodFailRes.body.success, false, 'Must not return false success');
    assert.ok(prodFailRes.body.error.includes('Database pool not connected'), 'Error message must reflect missing database');
  } finally {
    delete process.env.VERCEL;
  }

  // 3. Whitelisted account test (theyareop@gmail.com)
  const wlReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000' },
    body: {
      name: 'Whitelisted Admin',
      email: 'theyareop@gmail.com',
      password: 'SuperPassword123!',
      role: 'learner',
      stream: 'IT'
    }
  };
  const wlRes = createMockRes();
  await registerHandler(wlReq, wlRes);
  console.log('3.1 Whitelisted registration status:', wlRes.statusCode);
  assert.strictEqual(wlRes.statusCode, 200, 'Whitelisted account upsert should succeed without conflict');

  console.log('\n>>> ALL REGISTRATION, VERIFICATION, AND LOGIN TESTS PASSED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
