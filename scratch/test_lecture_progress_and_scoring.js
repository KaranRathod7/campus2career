const fs = require('fs');
const assert = require('assert');
const http = require('http');

console.log('================================================================');
console.log(' RUNNING COMPREHENSIVE SUITE:                                  ');
console.log(' 1. Mobile Layout & Overflow Diagnostics                        ');
console.log(' 2. Strict Score Breakdown Formula & Starting Baselines        ');
console.log(' 3. Watch-Time Verification & Anti-Fraud Lecture Tracking       ');
console.log('================================================================\n');

const html = fs.readFileSync('index.html', 'utf8');

let total = 0;
let passed = 0;

function it(desc, fn) {
  total++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  [PASS] ${desc}`);
    })
    .catch(err => {
      console.error(`  [FAIL] ${desc}: ${err.message}`);
    });
}

async function run() {
  console.log('--- 1. Mobile Layout & Viewport Verification ---');

  await it('Exact viewport meta tag is present inside <head>', () => {
    const metaMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i);
    assert(metaMatch, 'Viewport meta tag not found');
    assert.strictEqual(
      metaMatch[1],
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      'Viewport meta tag does not match required exact string'
    );
  });

  await it('Global container fluidity and position: relative enforced on html, body', () => {
    assert(html.includes('overflow-x: hidden !important'), 'Missing overflow-x: hidden !important');
    assert(html.includes('position: relative'), 'Missing position: relative on html/body');
    assert(html.includes('box-sizing: border-box !important'), 'Missing universal box-sizing: border-box !important');
  });

  await it('Navigation Bar collapses below 768px: desktop items hidden and drawer stack vertical', () => {
    assert(html.includes('#navLearnerItems'), 'Missing #navLearnerItems selector');
    assert(html.includes('#headerRecruiterAccessBtn'), 'Missing #headerRecruiterAccessBtn selector');
    assert(html.includes('flex-direction: column !important'), 'Missing flex-direction: column !important on mobile drawer');
  });

  await it('Temporary overflow debugging snippet is present right before </body>', () => {
    assert(html.includes("if (el.offsetWidth > document.documentElement.offsetWidth)"), 'Missing overflow check in snippet');
    assert(html.includes("console.warn('OVERFLOWING ELEMENT:', el);"), 'Missing console.warn in snippet');
  });

  console.log('\n--- 2. Strict Score Breakdown Formula & Starting Baselines ---');

  await it('calculateSkillBreakdown enforces strict components: Base (max 48), Lectures (max 15), Marathon (max 3), Tests (max 34)', () => {
    // Extract calculateSkillBreakdown
    const fnMatch = html.match(/function calculateSkillBreakdown\(skill\)\s*\{([\s\S]*?)\n    \}/);
    assert(fnMatch, 'calculateSkillBreakdown function not found in index.html');
    const calcFn = new Function('skill', 'appState', 'getActiveStreamKey', fnMatch[1]);

    const mockAppState = {
      user: { initialLevel: 'intermediate' },
      progress: { completedLessonsBySkill: {}, completedMarathons: {} },
      mcqHistory: []
    };
    const getActiveStreamKey = () => 'it';

    // Test a fresh Beginner signup
    const beginnerSkill = { id: 'java', name: 'Java Core', baseScore: 20, lectures_completed: 0 };
    const bdBeginner = calcFn(beginnerSkill, mockAppState, getActiveStreamKey);
    assert.strictEqual(bdBeginner.baseScore, 20, 'Beginner base must be 20');
    assert.strictEqual(bdBeginner.videoCredit, 0, 'Fresh account videoCredit must be 0');
    assert.strictEqual(bdBeginner.marathonBonus, 0, 'Fresh account marathonBonus must be 0');
    assert.strictEqual(bdBeginner.testBonus, 0, 'Fresh account testBonus must be 0');
    assert.strictEqual(bdBeginner.total, 20, 'Beginner total must strictly equal 20%');

    // Test a fresh Intermediate signup
    const intermediateSkill = { id: 'spring', name: 'Spring Boot', baseScore: 35, lectures_completed: 0 };
    const bdInter = calcFn(intermediateSkill, mockAppState, getActiveStreamKey);
    assert.strictEqual(bdInter.baseScore, 35, 'Intermediate base must be 35');
    assert.strictEqual(bdInter.total, 35, 'Intermediate total must strictly equal 35%');

    // Test a fresh Advanced signup (capped at 48% ceiling)
    const advancedSkill = { id: 'distributed', name: 'Distributed Systems', baseScore: 48, lectures_completed: 0 };
    const bdAdv = calcFn(advancedSkill, mockAppState, getActiveStreamKey);
    assert.strictEqual(bdAdv.baseScore, 48, 'Advanced base must be 48');
    assert.strictEqual(bdAdv.total, 48, 'Advanced total must strictly equal 48%');

    // Test an attempted inflated baseline (e.g. 75%) -> Capped at 48%
    const inflatedSkill = { id: 'cloud', name: 'Cloud Architecture', baseScore: 75, lectures_completed: 0 };
    const bdInflated = calcFn(inflatedSkill, mockAppState, getActiveStreamKey);
    assert.strictEqual(bdInflated.baseScore, 48, 'Unverified baseline must be capped at 48% ceiling');

    // Test 100% max sum: Base 48 + Lectures 15 + Marathon 3 + Tests 34 = 100
    mockAppState.progress.completedLessonsBySkill['distributed'] = new Array(15).fill('lec');
    mockAppState.progress.completedMarathons['it'] = true;
    mockAppState.mcqHistory.push({ module: 'Distributed Systems', score: 100 });
    const bdMax = calcFn(advancedSkill, mockAppState, getActiveStreamKey);
    assert.strictEqual(bdMax.baseScore, 48);
    assert.strictEqual(bdMax.videoCredit, 15);
    assert.strictEqual(bdMax.marathonBonus, 3);
    assert.strictEqual(bdMax.testBonus, 34);
    assert.strictEqual(bdMax.total, 100, 'Max potential score must be exactly 100%');
  });

  await it('Dashboard card subtext displays exact formula: Base • Lectures (+X%/15%) • Marathon (+X%/3%) • Diagnostic (+X%/34%)', () => {
    assert(html.includes("Lectures: <strong>+${bd.videoCredit}%/15%</strong> (${bd.completedLessonsCount}/15)"), 'Formula subtext missing 15% lecture weight');
    assert(html.includes("Marathon: <strong>+${bd.marathonBonus}%/3%</strong>"), 'Formula subtext missing 3% marathon weight');
    assert(html.includes("Diagnostic: <strong>+${bd.testBonus}%/34%</strong>"), 'Formula subtext missing 34% diagnostic weight');
  });

  console.log('\n--- 3. Watch-Time Verification & Anti-Fraud Lecture Tracking ---');

  const db = require('../api/_handlers/db');

  const testUserId = 'test-watch-user-' + Date.now();
  const testEmail = `watchuser_${Date.now()}@example.com`;
  const skillName = 'Bare-Metal STM32';
  const duration = 1200; // 20 minutes

  await it('Fraud prevention: watch time < 85% of duration is NOT completed', async () => {
    // 50% watch time (600s / 1200s)
    const result = await db.recordLectureProgress({
      user_id: testUserId,
      user_email: testEmail,
      skill_name: skillName,
      lecture_id: 'stm32-lec-1',
      duration_seconds: duration,
      time_watched_seconds: 600
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.completed, false, 'Should NOT be completed at 50% watch time');
    assert.strictEqual(result.percent_watched, 50);
  });

  await it('Legitimate verification: watch time >= 85% completes lecture and increments unique count', async () => {
    // 90% watch time (1080s / 1200s)
    const result = await db.recordLectureProgress({
      user_id: testUserId,
      user_email: testEmail,
      skill_name: skillName,
      lecture_id: 'stm32-lec-1',
      duration_seconds: duration,
      time_watched_seconds: 1080
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.completed, true, 'Should be completed at 90% watch time');
    assert.strictEqual(result.lectures_completed, 1);
    assert.strictEqual(result.lecture_score, 1);
  });

  await it('Anti-fraud single-lecture cap: re-watching the same lecture does NOT double-count', async () => {
    // Re-watch the same lecture 'stm32-lec-1' for another 1200s
    const result = await db.recordLectureProgress({
      user_id: testUserId,
      user_email: testEmail,
      skill_name: skillName,
      lecture_id: 'stm32-lec-1',
      duration_seconds: duration,
      time_watched_seconds: 1200
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.completed, true);
    assert.strictEqual(result.lectures_completed, 1, 'Distinct lecture count must remain 1 (no double-counting)');
  });

  await it('Watching a second unique lecture increments count to 2', async () => {
    const result = await db.recordLectureProgress({
      user_id: testUserId,
      user_email: testEmail,
      skill_name: skillName,
      lecture_id: 'stm32-lec-2',
      duration_seconds: duration,
      time_watched_seconds: 1100
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.completed, true);
    assert.strictEqual(result.lectures_completed, 2, 'Distinct lecture count must increment to 2');
    assert.strictEqual(result.lecture_score, 2);
  });

  await it('getCompletedLectures retrieves legitimate distinct records for user and skill', async () => {
    const completedList = await db.getCompletedLectures({
      user_id: testUserId,
      user_email: testEmail,
      skill_name: skillName
    });

    assert(Array.isArray(completedList), 'Must return an array of completed lectures');
    assert.strictEqual(completedList.length, 2, 'Must contain exactly 2 unique completed lectures');
    const ids = completedList.map(l => l.lecture_id);
    assert(ids.includes('stm32-lec-1'));
    assert(ids.includes('stm32-lec-2'));
  });

  await it('API endpoint POST /api/student/lecture-progress validates parameters and returns verified status', async () => {
    const handler = require('../api/_handlers/student/lecture-progress');

    let responseCode = null;
    let responseData = null;

    const mockReq = {
      method: 'POST',
      headers: { origin: 'http://localhost:5000' },
      body: {
        user_id: testUserId,
        user_email: testEmail,
        skill_name: skillName,
        lecture_id: 'stm32-lec-3',
        duration_seconds: 1000,
        time_watched_seconds: 900 // 90%
      }
    };

    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        responseCode = code;
        return {
          json: (data) => { responseData = data; return data; },
          end: () => {}
        };
      }
    };

    await handler(mockReq, mockRes);
    assert.strictEqual(responseCode, 200);
    assert.strictEqual(responseData.success, true);
    assert.strictEqual(responseData.completed, true);
    assert.strictEqual(responseData.lectures_completed, 3);
  });

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed}/${total} Tests Passed (${Math.round(passed/total * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
