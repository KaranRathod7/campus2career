const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Extract calculateSkillBreakdown function from index.html
const fnRegex = /function calculateSkillBreakdown\(skill\) \{([\s\S]*?)\n    \}/;
const match = html.match(fnRegex);
assert.ok(match, 'calculateSkillBreakdown must be present in index.html');

// Create sandbox function
const calculateSkillBreakdown = new Function('skill', 'appState', 'getActiveStreamKey', `
  let getActiveStreamKeyFn = getActiveStreamKey || (() => 'it');
  ${match[1]}
`);

console.log('=== TESTING FRONTEND FORMULA & 80% MASTERY CAP ===\n');

// 1. Fresh skill
const freshSkill = { id: 'docker', name: 'Docker & Containers', base_percentage: 35 };
const appStateFresh = { currentStack: [freshSkill], mcqHistory: [], progress: {} };
const resFresh = calculateSkillBreakdown(freshSkill, appStateFresh, () => 'it');
assert.strictEqual(resFresh.baseScore, 35);
assert.strictEqual(resFresh.videoCredit, 0);
assert.strictEqual(resFresh.marathonBonus, 0);
assert.strictEqual(resFresh.testBonus, 0);
assert.strictEqual(resFresh.total, 35);
assert.strictEqual(resFresh.isCapped, false);
console.log('✔ PASS: Fresh skill breakdown is 35% base, +0% lectures, +0% marathon, +0% tests, total 35%.');

// 2. One Docker test with 100% score (+5% gain)
const appStateTest1 = {
  currentStack: [freshSkill],
  mcqHistory: [
    { skill_name: 'Docker & Containers', module: 'Docker & Containerization', score: 100 }
  ],
  progress: {}
};
const resTest1 = calculateSkillBreakdown(freshSkill, appStateTest1, () => 'it');
assert.strictEqual(resTest1.testBonus, 5, '100% score awards +5% gain');
assert.strictEqual(resTest1.total, 40, '35 base + 5 test = 40%');
console.log('✔ PASS: 100% benchmark awards +5% incrementally (total: 40%).');

// 3. Second Docker test with 80% score (+4% gain -> 9% total)
const appStateTest2 = {
  currentStack: [freshSkill],
  mcqHistory: [
    { skill_name: 'Docker & Containers', module: 'Docker & Containerization', score: 100 },
    { skill_name: 'Docker & Containers', module: 'Docker & Containerization', score: 80 }
  ],
  progress: {}
};
const resTest2 = calculateSkillBreakdown(freshSkill, appStateTest2, () => 'it');
assert.strictEqual(resTest2.testBonus, 9, '100% (+5) + 80% (+4) = 9% gain');
assert.strictEqual(resTest2.total, 44, '35 base + 9 test = 44%');
console.log('✔ PASS: Second test at 80% adds +4% (diagnostic: 9%, total: 44%).');

// 4. Verify that Docker tests do NOT affect Production Debugging
const debugSkill = { id: 'debug', name: 'Production Debugging', base_percentage: 35 };
const resDebug = calculateSkillBreakdown(debugSkill, appStateTest2, () => 'it');
assert.strictEqual(resDebug.testBonus, 0, 'Production Debugging testBonus must be 0');
assert.strictEqual(resDebug.total, 35, 'Production Debugging total must remain 35%');
console.log('✔ PASS: Docker test attempts did NOT affect Production Debugging (remains 35%).');

// 5. 80% Mastery Gate Check: rawTotal = 35 + 15 + 3 + 30 = 83%, latest test is 90%
const appStateCapped = {
  currentStack: [freshSkill],
  mcqHistory: [
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 }, // +5 = 30 total
    { skill_name: 'Docker & Containers', module: 'Docker', score: 90 }   // latest < 100
  ],
  progress: {
    completedLessonsBySkill: { docker: new Array(15).fill('lec') },
    completedMarathons: { it: true }
  }
};
const resCapped = calculateSkillBreakdown(freshSkill, appStateCapped, () => 'it');
assert.strictEqual(resCapped.rawTotal, 87, 'Raw total is 35 + 15 + 3 + 34 = 87%');
assert.strictEqual(resCapped.isCapped, true, 'isCapped must be true because latest test (90%) < 100%');
assert.strictEqual(resCapped.total, 80, 'Total score must be capped strictly at 80%');
console.log('✔ PASS: 80% Mastery Gate strictly caps total score at 80% (isCapped: true).');

// 6. Unlocking Mastery Gate with 100% benchmark score
const appStateUnlocked = {
  currentStack: [freshSkill],
  mcqHistory: [
    ...appStateCapped.mcqHistory,
    { skill_name: 'Docker & Containers', module: 'Docker', score: 100 } // latest == 100
  ],
  progress: appStateCapped.progress
};
const resUnlocked = calculateSkillBreakdown(freshSkill, appStateUnlocked, () => 'it');
assert.strictEqual(resUnlocked.isCapped, false, 'isCapped must be false when latest test == 100%');
assert.strictEqual(resUnlocked.total, 87, 'Total score unlocks to rawTotal (87%)');
console.log('✔ PASS: Scoring 100% on benchmark unlocks master level beyond 80% to 87%!');

console.log('\n======================================================');
console.log(' ALL FRONTEND FORMULA TESTS PASSED SUCCESSFULLY!');
console.log('======================================================');
