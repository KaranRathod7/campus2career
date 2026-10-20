const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

console.log('--- Verifying Top Navigation Bar Header Refactoring ---');

// 1. Compact Brand & Logo Section
assert.ok(html.includes('text-sm sm:text-[15px] tracking-tight text-slate-900 dark:text-white'), 'Brand title must use compact font size (text-sm sm:text-[15px])');
assert.ok(html.includes('hidden 2xl:block') && html.includes('Personalized Core Skill Competence Engine'), 'Subtitle must be hidden on screens under 1400px (hidden 2xl:block)');
assert.ok(html.includes('id="navVersionBadge"') && html.includes('text-[8px] px-1 py-0.2'), 'Version badge must be compact (text-[8px] px-1 py-0.2)');
console.log('✓ 1. Compact Brand & Logo Section verified.');

// 2. Remove "Signals" Tab
assert.ok(!html.includes('id="navBtn-recruiter-market"'), 'Signals tab (#navBtn-recruiter-market) must be completely removed from desktop navbar');
assert.ok(html.includes('id="navBtn-recruiter-candidates"'), 'Candidates tab must exist');
assert.ok(html.includes('id="navBtn-recruiter-invites"'), 'Invitations tab must exist');
console.log('✓ 2. "Signals" Tab completely removed from navigation bar verified.');

// 3. Tightened Navigation Links & Spacing
assert.ok(html.includes('class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-semibold rounded-lg text-[#008080]'), 'Home button has tightened padding (px-2 py-1 text-xs)');
assert.ok(html.includes('id="trackerCounterNav" class="ml-1 px-1 py-0.2 bg-teal-100 dark:bg-teal-900 text-[#008080] dark:text-teal-300 text-[9px] rounded-full font-bold">2</span>'), 'Tracker counter badge is compact (px-1 py-0.2 text-[9px])');
assert.ok(html.includes('14,821') && html.includes('ml-1 px-1 py-0.2 bg-emerald-100'), 'Candidates badge is compact');
assert.ok(html.includes('id="recruiterInvitesCountBadge" class="ml-1 px-1 py-0.2 bg-teal-100 dark:bg-teal-900 text-[#008080] dark:text-teal-300 text-[9px] rounded-full font-bold">1</span>'), 'Recruiter invites badge is compact');
console.log('✓ 3. Tightened Navigation Links & Compact Badges verified.');

// 4. Invisible Horizontal Scrollbar as Fallback (Edge-to-Edge Scroll)
assert.ok(html.includes('.nav-container::-webkit-scrollbar {\n      display: none;\n    }'), 'Webkit scrollbar hidden on .nav-container');
assert.ok(html.includes('.nav-container {\n      -ms-overflow-style: none;  /* IE and Edge */\n      scrollbar-width: none;  /* Firefox */\n      overflow-x: auto;\n      white-space: nowrap;\n    }'), 'Firefox and IE/Edge scrollbar hidden with overflow-x auto and white-space nowrap');
assert.ok(html.includes('.nav-tab-btn {\n      flex-shrink: 0;\n    }'), 'nav-tab-btn has flex-shrink: 0 in CSS');
assert.ok(html.includes('nav-container hidden md:flex items-center min-w-0 flex-1 mx-2 overflow-x-auto whitespace-nowrap'), 'Container element has nav-container and flex-1 overflow-x-auto whitespace-nowrap');
console.log('✓ 4. Invisible horizontal scrollbar & flex-shrink:0 on buttons verified.');

console.log('\n>>> ALL 4 NAVBAR REFACTORING REQUIREMENTS VERIFIED SUCCESSFULLY! <<<');
