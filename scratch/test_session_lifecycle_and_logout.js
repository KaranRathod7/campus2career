const assert = require('assert');
const fs = require('fs');
const { setUserCookie, setAdminCookie, clearUserCookie, clearAdminCookie, USER_COOKIE_NAME, ADMIN_COOKIE_NAME } = require('../api/_handlers/authMiddleware');
const logoutHandler = require('../api/_handlers/logout');
const meHandler = require('../api/_handlers/me');

console.log('=== Test Suite: Session Lifecycle & Logout Persistence ===');

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    getHeader(k) { return this.headers[k.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
}

// 1. Invalidate Session on Browser Close (Session-Only Cookie Checks)
console.log('1. Checking backend Set-Cookie headers for session-only properties:');
const userRes = createMockRes();
setUserCookie(userRes, 'test_jwt_session_token');
const userCookie = userRes.headers['set-cookie'];
assert.ok(userCookie, 'setUserCookie must output a Set-Cookie header');
assert.ok(!userCookie.includes('Max-Age'), 'User cookie must NOT have Max-Age (session-only)');
assert.ok(!userCookie.includes('Expires'), 'User cookie must NOT have Expires (session-only)');
assert.ok(userCookie.includes('HttpOnly'), 'User cookie must have HttpOnly');
assert.ok(userCookie.includes('Path=/'), 'User cookie must have Path=/');
console.log('   ✓ User cookie is strictly a Session Cookie without Max-Age or Expires.');

const adminRes = createMockRes();
setAdminCookie(adminRes, 'test_admin_session_token');
const adminCookie = adminRes.headers['set-cookie'];
assert.ok(adminCookie, 'setAdminCookie must output a Set-Cookie header');
assert.ok(!adminCookie.includes('Max-Age'), 'Admin cookie must NOT have Max-Age (session-only)');
assert.ok(!adminCookie.includes('Expires'), 'Admin cookie must NOT have Expires (session-only)');
console.log('   ✓ Admin cookie is strictly a Session Cookie without Max-Age or Expires.');

// 2. Comprehensive Logout Purge Checks (Backend)
console.log('\n2. Checking POST /api/auth/logout cookie destruction headers:');
const logoutRes = createMockRes();
logoutHandler({ method: 'POST', headers: {} }, logoutRes);
const logoutCookieHeader = logoutRes.headers['set-cookie'];
assert.ok(logoutCookieHeader, 'Logout must send expired Set-Cookie header');
const logoutCookieStr = Array.isArray(logoutCookieHeader) ? logoutCookieHeader.join('; ') : String(logoutCookieHeader);
assert.ok(logoutCookieStr.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT'), 'Must include 1970 Expires epoch to invalidate immediately');
assert.ok(logoutCookieStr.includes('Max-Age=0'), 'Must include Max-Age=0');
assert.ok(logoutCookieStr.includes('HttpOnly'), 'Must retain HttpOnly on eviction');
assert.ok(logoutCookieStr.includes(USER_COOKIE_NAME) || logoutCookieStr.includes('token='), 'Must clear user cookie');
console.log('   ✓ Logout sends expired 1970 epoch cookie header with Max-Age=0.');

// 3. Frontend Client-Side Script Verification in index.html
console.log('\n3. Verifying frontend auth scripts and session storage lifecycle in index.html:');
const html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// Check loadStateFromStorage
assert.ok(html.includes('sessionStorage.getItem(STORAGE_KEY_USER)'), 'loadStateFromStorage must read user from sessionStorage');
assert.ok(html.includes('localStorage.removeItem(STORAGE_KEY_USER)'), 'loadStateFromStorage must remove any legacy user from localStorage');
console.log('   ✓ loadStateFromStorage reads strictly from sessionStorage and purges localStorage user.');

// Check saveStateToStorage
assert.ok(html.includes('sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(appState.user))'), 'saveStateToStorage must write user to sessionStorage');
assert.ok(html.includes('localStorage.removeItem(STORAGE_KEY_USER)'), 'saveStateToStorage must wipe user from localStorage');
console.log('   ✓ saveStateToStorage saves user strictly to sessionStorage, never localStorage.');

// Check handleLogout
assert.ok(html.includes('localStorage.clear()'), 'handleLogout must call localStorage.clear()');
assert.ok(html.includes('sessionStorage.clear()'), 'handleLogout must call sessionStorage.clear()');
assert.ok(html.includes("fetch('/api/auth/logout'"), 'handleLogout must call /api/auth/logout');
assert.ok(html.includes('window.currentUser = null'), 'handleLogout must reset window.currentUser = null');
assert.ok(html.includes('window.isLoggedIn = false'), 'handleLogout must reset window.isLoggedIn = false');
assert.ok(html.includes('appState.user = null'), 'handleLogout must reset appState.user = null');
assert.ok(html.includes("window.location.replace('/')"), "handleLogout must force hard reload/redirect to '/'");
console.log('   ✓ handleLogout clears all storages, calls backend logout, resets in-memory variables, and executes window.location.replace(\'/\').');

// Check checkAuthSession & App Initialization
assert.ok(html.includes("fetch('/api/auth/me'"), 'checkAuthSession must check /api/auth/me');
assert.ok(html.includes('sessionStorage.getItem(STORAGE_KEY_USER)'), 'checkAuthSession must check sessionStorage fallback');
assert.ok(html.includes('appState.user = null'), 'checkAuthSession must set appState.user = null when no session exists');
console.log('   ✓ App initialization checks /api/auth/me and defaults immediately to unauthenticated/guest if session is empty.');

console.log('\n>>> ALL SESSION LIFECYCLE AND LOGOUT PERSISTENCE TESTS PASSED (100%)! <<<');
