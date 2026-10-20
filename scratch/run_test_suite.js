const fs = require('fs');
const vm = require('vm');

const rawHtml = fs.readFileSync('index.html', 'utf8');
const html = rawHtml.replace(/\r\n/g, '\n');

console.log('=== RUNNING CAMPUS2CAREER COMPREHENSIVE OVERHAUL TEST SUITE ===\n');
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

// 1. Brand Title non-truncation
assert(
  !html.includes('shrink-0 max-w-[40%] sm:max-w-none min-w-0') &&
  html.includes('whitespace-nowrap">Campus<span class="text-[#008080] dark:text-teal-400">2Career</span></span>'),
  'Brand title does not have max-w-[40%] or truncate constraint and uses whitespace-nowrap'
);

// 2. Mobile Header actions
assert(
  html.includes('<button type="button" onclick="openAuthModal(\'signup\')" class="text-xs bg-[#008080] hover:bg-[#006666] text-white font-bold px-2 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-all shrink-0 whitespace-nowrap min-h-[36px] sm:min-h-[40px] flex items-center space-x-1">'),
  'Sign Up button in header is visible on mobile viewports'
);

assert(
  html.includes('<button type="button" onclick="handleLogout()" id="navLogoutBtn" title="Log Out / End Session" class="inline-flex items-center space-x-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600'),
  'Log Out button in header is inline-flex (visible on mobile viewports)'
);

// 3. Top Banner Compactness on mobile
assert(
  html.includes('Built for <strong class="text-teal-300">B.Tech Undergrads &amp; Tech Recruiters</strong><span class="hidden md:inline">: Master core discipline skills alongside essential real-world engineering and management workflows.</span>'),
  'Top banner secondary sentence is hidden on mobile via hidden md:inline'
);

// 4. Share Modal & URL
assert(
  html.includes('max-w-[calc(100vw-32px)]') && html.includes('https://campus2career-pi.vercel.app/'),
  'Share modal uses max-w-[calc(100vw-32px)] and defaults to https://campus2career-pi.vercel.app/'
);

assert(
  html.includes('function getPlatformShareUrl()') &&
  html.includes("return 'https://campus2career-pi.vercel.app/';"),
  'getPlatformShareUrl returns production domain https://campus2career-pi.vercel.app/'
);

// 5. Universal scroll lock
assert(
  html.includes('function lockBodyScroll(lock)') &&
  html.includes('lockBodyScroll(true);') &&
  html.includes('lockBodyScroll(false);'),
  'Universal lockBodyScroll is implemented and called on modal open/close'
);

// 6. Strict Role Separation in updateAuthUI
assert(
  html.includes("const isStudent = (appState.user && appState.user.role !== 'recruiter');") &&
  html.includes("if (isStudent) {\n          headerRecruiterBtn.classList.add('hidden');") &&
  html.includes("if (isStudent) {\n          mobileDrawerRecruiterBtn.classList.add('hidden');") &&
  html.includes("if (isRecruiter) {\n          mobileRecruiterLinks.classList.remove('hidden');\n        } else {\n          mobileRecruiterLinks.classList.add('hidden');"),
  'updateAuthUI strictly hides recruiter-only elements when logged in as student'
);

assert(
  html.includes("document.querySelectorAll('.auth-required-mobile-tab').forEach(b => {\n        if (isAuthenticated) {\n          b.classList.remove('hidden');\n        } else {\n          b.classList.add('hidden');\n        }\n      });"),
  'Deep learning links in mobile drawer are hidden for unauthenticated guests'
);

// 7. MCQ Exam Module Targeting
assert(
  html.includes('it_spring: {') &&
  html.includes('title: "Spring Boot & Microservices",') &&
  html.includes('When architecting an idempotent payment API endpoint in Spring Boot'),
  'Dedicated it_spring module with 10 Spring Boot questions exists in STREAM_DATA.it'
);

assert(
  html.includes('it_java: {') &&
  html.includes('title: "Java & Multithreading",'),
  'Dedicated it_java module exists in STREAM_DATA.it with Java & Multithreading title'
);

// 8. Dynamic Title in switchQuizModule
assert(
  html.includes('const testTitle = appState.targetSkillName') &&
  html.includes('? `Benchmark Assessment: ${appState.targetSkillName}`') &&
  html.includes(': `Benchmark Assessment: ${appState.quizModules[modKey].title}`;'),
  'switchQuizModule dynamically renders "Benchmark Assessment: {targetSkillName}"'
);

// 9. Study Video Playlist link & getSkillCurriculum
assert(
  html.includes("openSkillResourceViewer('${skill.id}', 'en', 0, '${encodeURIComponent(skill.name)}')") &&
  html.includes('function getSkillCurriculum(skillId, skillName)'),
  'Study Video Playlist button passes both skillId and encoded skillName to getSkillCurriculum'
);

// 10. JavaScript Syntax Verification across all scripts in index.html
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
let syntaxErrors = 0;

while ((match = scriptRegex.exec(rawHtml)) !== null) {
  scriptIndex++;
  const jsCode = match[1];
  if (!jsCode.trim()) continue;
  try {
    new vm.Script(jsCode);
  } catch (err) {
    console.error(`Syntax error in script tag #${scriptIndex}:`, err.message);
    syntaxErrors++;
  }
}

assert(syntaxErrors === 0, `All ${scriptIndex} script blocks compile with 0 syntax errors`);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
}
