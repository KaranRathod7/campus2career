// Test SQL error handling in register, verify-pin, and login
const assert = require('assert');
const db = require('../api/_handlers/db');
const registerHandler = require('../api/_handlers/register');
const loginHandler = require('../api/_handlers/login');

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

async function runErrorTests() {
  console.log('--- Testing Database Error Interception & HTTP 500 Reporting ---');

  // Backup original createUser
  const originalCreateUser = db.createUser;
  const originalGetUserByEmail = db.getUserByEmail;

  try {
    // 1. Simulate SQL Insert error
    db.createUser = async function() {
      const err = new Error('relation "users" does not exist');
      err.detail = 'Table was not found in schema public';
      console.error('[DB Insert Error]:', err.message, err.detail);
      throw err;
    };

    const regReq = {
      method: 'POST',
      headers: { origin: 'http://localhost:8000' },
      body: {
        name: 'Error Tester',
        email: 'sqlerror_test@example.com',
        password: 'Password123!',
        role: 'learner'
      }
    };
    const regRes = createMockRes();
    await registerHandler(regReq, regRes);

    console.log('1. SQL Insert Failure HTTP Status:', regRes.statusCode);
    console.log('1. SQL Insert Failure Body:', regRes.body);
    assert.strictEqual(regRes.statusCode, 500, 'Must return HTTP 500 when insert fails');
    assert.strictEqual(regRes.body.success, false, 'Must have success: false');
    assert.strictEqual(regRes.body.error, 'relation "users" does not exist');

    // 2. Simulate SQL Login Lookup error
    db.getUserByEmail = async function() {
      const err = new Error('connection terminated unexpectedly');
      err.detail = 'SSL syscall error: EOF detected';
      throw err;
    };

    const loginReq = {
      method: 'POST',
      headers: { origin: 'http://localhost:8000' },
      body: {
        email: 'sqlerror_test@example.com',
        password: 'Password123!'
      }
    };
    const loginRes = createMockRes();
    await loginHandler(loginReq, loginRes);

    console.log('2. SQL Login Lookup Failure HTTP Status:', loginRes.statusCode);
    console.log('2. SQL Login Lookup Failure Body:', loginRes.body);
    assert.strictEqual(loginRes.statusCode, 500, 'Must return HTTP 500 when DB lookup fails');
    assert.strictEqual(loginRes.body.success, false, 'Must have success: false');
    assert.strictEqual(loginRes.body.error, 'connection terminated unexpectedly');

    console.log('\n>>> ERROR INTERCEPTION TESTS PASSED! No silent failures or false successes occurred. <<<');
  } finally {
    db.createUser = originalCreateUser;
    db.getUserByEmail = originalGetUserByEmail;
  }
}

runErrorTests().catch(err => {
  console.error('Error test failed:', err);
  process.exit(1);
});
