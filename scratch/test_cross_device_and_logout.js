// End-to-End Test Suite for Cross-Device Verification, Auto-Polling, and Logout Security
const assert = require('assert');
const db = require('../api/_handlers/db');
const registerHandler = require('../api/_handlers/register');
const verifyEmailHandler = require('../api/_handlers/verify-email');
const authStatusHandler = require('../api/_handlers/auth-status');
const logoutHandler = require('../api/_handlers/logout');
const meHandler = require('../api/_handlers/me');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
}

async function runCrossDeviceTests() {
  console.log('=== Starting Cross-Device Auto-Polling & Logout Security Tests ===');

  const testEmail = `crossdevice_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  // Step 1: Device A initiates registration
  console.log('1. Device A: Initiating registration for:', testEmail);
  const regReq = {
    method: 'POST',
    headers: { origin: 'http://localhost:8000', host: 'localhost:8000' },
    body: {
      name: 'Cross Device Student',
      email: testEmail,
      password: testPassword,
      role: 'learner',
      stream: 'IT'
    }
  };
  const regRes = createMockRes();
  await registerHandler(regReq, regRes);
  assert.strictEqual(regRes.statusCode, 200, 'Registration must succeed with 200');
  assert.strictEqual(regRes.body.success, true);
  console.log('   Registration successful on Device A.');

  // Step 2: Device A polls /api/auth/status before verification
  console.log('2. Device A: Polling /api/auth/status before email link is clicked on Device B');
  const pollPreReq = {
    method: 'GET',
    url: `/api/auth/status?email=${encodeURIComponent(testEmail)}`,
    headers: { host: 'localhost:8000' }
  };
  const pollPreRes = createMockRes();
  await authStatusHandler(pollPreReq, pollPreRes);
  assert.strictEqual(pollPreRes.statusCode, 200);
  assert.strictEqual(pollPreRes.body.is_verified, false, 'User must not be verified yet');
  console.log('   Poller correctly reports: is_verified = false');

  // Step 3: Fetch the generated verification token from pending_verifications
  const store = db.getLocalStore ? db.getLocalStore() : null;
  let pendingRecord = null;
  if (store && store.pending_verifications) {
    pendingRecord = store.pending_verifications.find(p => p.email.toLowerCase() === testEmail.toLowerCase());
  } else {
    pendingRecord = await db.getPendingVerification(testEmail, '');
  }
  assert.ok(pendingRecord, 'Pending verification token must exist in DB');
  const token = pendingRecord.token;
  console.log('3. Found generated verification token for email link:', token);

  // Step 4: Device B clicks the verification link from email
  console.log('4. Device B: User clicks the 1-click verification link on mobile');
  const verifyLinkReq = {
    method: 'GET',
    url: `/api/verify-email?token=${token}&email=${encodeURIComponent(testEmail)}`,
    headers: { host: 'localhost:8000' }
  };
  const verifyLinkRes = {
    ...createMockRes(),
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      return this;
    }
  };
  await verifyEmailHandler(verifyLinkReq, verifyLinkRes);
  console.log('   Device B redirected with status:', verifyLinkRes.statusCode, 'Location:', verifyLinkRes.headers?.Location);
  assert.strictEqual(verifyLinkRes.statusCode, 302, 'Email verification link must redirect to dashboard with verified=true');
  assert.ok(verifyLinkRes.headers.Location.includes('verified=true'), 'Redirect must contain verified=true');

  // Step 5: Device A polls /api/auth/status again (Simulating the 2.5s auto-polling loop)
  console.log('5. Device A: Auto-polling /api/auth/status after Device B clicked the link');
  const pollPostReq = {
    method: 'GET',
    url: `/api/auth/status?email=${encodeURIComponent(testEmail)}`,
    headers: { host: 'localhost:8000' }
  };
  const pollPostRes = createMockRes();
  await authStatusHandler(pollPostReq, pollPostRes);
  assert.strictEqual(pollPostRes.statusCode, 200);
  assert.strictEqual(pollPostRes.body.is_verified, true, 'Device A poller must now detect is_verified = true');
  assert.strictEqual(pollPostRes.body.authenticated, true);
  assert.ok(pollPostRes.body.user, 'Session user payload must be provided to Device A');
  assert.ok(pollPostRes.body.token, 'Session token must be provided to Device A');
  assert.ok(pollPostRes.headers['set-cookie'], 'Set-Cookie header must be sent to Device A for seamless auto-login');
  assert.ok(!pollPostRes.headers['set-cookie'].includes('Max-Age'), 'Auth session cookie must NOT contain Max-Age (must be session-only)');
  assert.ok(!pollPostRes.headers['set-cookie'].includes('Expires'), 'Auth session cookie must NOT contain Expires (must be session-only)');
  console.log('   Device A auto-poller successfully detected cross-device verification with session-only cookie!');

  // Step 6: Verify Device A session works with /api/me
  console.log('6. Device A: Calling /api/me with newly issued cookie');
  const cookieVal = pollPostRes.headers['set-cookie'];
  const meReq = {
    method: 'GET',
    headers: { host: 'localhost:8000', cookie: cookieVal }
  };
  const meRes = createMockRes();
  await meHandler(meReq, meRes);
  assert.strictEqual(meRes.statusCode, 200);
  assert.strictEqual(meRes.body.success, true);
  assert.strictEqual(meRes.body.user.email, testEmail);
  console.log('   Device A session is active and authenticated for:', meRes.body.user.name);

  // Step 7: Explicit Logout on Device A
  console.log('7. Device A: User clicks prominent "Log Out" button');
  const logoutReq = {
    method: 'POST',
    headers: { host: 'localhost:8000', cookie: cookieVal }
  };
  const logoutRes = createMockRes();
  await logoutHandler(logoutReq, logoutRes);
  assert.strictEqual(logoutRes.statusCode, 200);
  assert.strictEqual(logoutRes.body.success, true);
  assert.ok(logoutRes.headers['set-cookie'], 'Logout must send expired Set-Cookie header');
  const sc = logoutRes.headers['set-cookie'];
  const scStr = Array.isArray(sc) ? sc.join('; ') : String(sc);
  assert.ok(scStr.includes('Max-Age=0'), 'Cookie Max-Age must be 0 to destroy session');
  console.log('   Backend cleared HTTP-only session cookie.');

  // Step 8: Subsequent request to /api/me with expired cookie must fail (no lingering session)
  console.log('8. Device A: Verifying /api/me after logout');
  const expiredCookie = Array.isArray(sc) ? sc.join('; ') : String(sc);
  const postLogoutMeReq = {
    method: 'GET',
    headers: { host: 'localhost:8000', cookie: expiredCookie }
  };
  const postLogoutMeRes = createMockRes();
  await meHandler(postLogoutMeReq, postLogoutMeRes);
  assert.strictEqual(postLogoutMeRes.statusCode, 401, 'Post-logout request must return 401 Unauthorized');
  assert.strictEqual(postLogoutMeRes.body.authenticated, false);
  console.log('   Session destroyed! Re-authentication strictly required.');

  console.log('\n>>> ALL CROSS-DEVICE AUTO-POLLING AND LOGOUT TESTS PASSED WITH 100% SUCCESS! <<<');
}

runCrossDeviceTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
