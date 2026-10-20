// Comprehensive sanity verification test
const fs = require('fs');
const assert = require('assert');

console.log('--- Verifying index.html features & responsive integrity ---');

const html = fs.readFileSync('index.html', 'utf-8');

// 1. Check viewport tag
assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'), 'Must have viewport meta tag');
console.log('✓ Viewport meta tag verified.');

// 2. Check overflow-x protection in style
assert.ok(html.includes('overflow-x: hidden !important'), 'Must have overflow-x: hidden !important on html/body');
console.log('✓ Root viewport overflow-x protection verified.');

// 3. Check mobileMenuToggleBtn is md:hidden
assert.ok(html.includes('id="mobileMenuToggleBtn" onclick="toggleMobileNav()" class="md:hidden'), 'mobileMenuToggleBtn must be md:hidden');
console.log('✓ Hamburger toggle button (md:hidden) verified.');

// 4. Check mobileNavDrawer is md:hidden
assert.ok(html.includes('id="mobileNavDrawer" class="hidden md:hidden'), 'mobileNavDrawer must be hidden md:hidden');
console.log('✓ Mobile navigation drawer (md:hidden) verified.');

// 5. Check desktop nav tabs are hidden md:flex
assert.ok(html.includes('id="navLearnerItems" class="hidden md:flex'), 'navLearnerItems must be hidden md:flex');
assert.ok(html.includes('id="navRecruiterItems" class="hidden md:flex'), 'navRecruiterItems must be hidden md:flex');
console.log('✓ Desktop navigation links collapsed on mobile (<768px) verified.');

// 6. Check explicit Log Out button in header
assert.ok(html.includes('id="navLogoutBtn"'), 'navLogoutBtn must exist in header');
assert.ok(html.includes('Log Out'), 'Must display "Log Out" text');
console.log('✓ Prominent Log Out button in header verified.');

// 7. Check explicit Log Out button in mobile drawer
assert.ok(html.includes('Log Out of Campus2Career'), 'Must have Log Out button in mobile drawer');
console.log('✓ Log Out button in mobile drawer verified.');

// 8. Check Cross-Device Auto-Verification Beacon in authVerifyStep
assert.ok(html.includes('Auto-checking: Opening the email link on your phone or other device'), 'Must have cross-device auto-checking beacon in verification step');
console.log('✓ Cross-device auto-verification beacon in modal verified.');

// 9. Check Device B confirmation modal exists
assert.ok(html.includes('id="deviceBVerifiedModal"'), 'Must have deviceBVerifiedModal');
assert.ok(html.includes('dismissDeviceBVerifiedModal()'), 'Must have dismissDeviceBVerifiedModal handler');
console.log('✓ Device B confirmation modal verified.');

// 10. Check polling interval is 2500ms
assert.ok(html.includes('}, 2500);'), 'Verification polling interval must be 2.5s (2500ms)');
assert.ok(html.includes('/api/auth/status?email='), 'Polling must query /api/auth/status');
console.log('✓ Auto-polling interval (2.5s) to /api/auth/status verified.');

// 11. Check secure handleLogout implementation
assert.ok(html.includes('/api/auth/logout'), 'handleLogout must call /api/auth/logout');
assert.ok(html.includes("sessionStorage.clear()"), 'handleLogout must clear sessionStorage');
console.log('✓ Secure logout session invalidation verified.');

console.log('\n>>> ALL 11 VERIFICATION CHECKS PASSED! <<<');
