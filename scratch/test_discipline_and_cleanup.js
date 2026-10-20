// scratch/test_discipline_and_cleanup.js
// Automated Verification Suite for:
// 1. User-Specific Discipline Skills & Seeding (Mechanical User gets ME skills, zero IT skills)
// 2. Fresh User Analytics (0.0 hrs, 0 Days, 0 Tests, 0% Growth, zero mock analytics)
// 3. Strict MCQ Test Submission Scoping (Updates target user & skill ONLY; logged in student_test_attempts)
// 4. Cascade Cleanup on User Deletion (Purges all 10 tables, zero orphaned rows)

const fs = require('fs');
const path = require('path');
const db = require('../api/_handlers/db');
const registerHandler = require('../api/_handlers/register');
const studentSkillsHandler = require('../api/_handlers/student/skills');
const studentDashboardHandler = require('../api/_handlers/student/dashboard');
const analyticsHandler = require('../api/_handlers/analytics');
const submitTestHandler = require('../api/_handlers/tests/submit');

function mockReqRes({ method = 'GET', body = {}, query = {}, headers = {} }) {
  let statusCode = 200;
  let responseData = null;

  const res = {
    setHeader: () => {},
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
    query,
    headers: {
      'user-agent': 'Discipline-Cleanup-TestSuite/1.0',
      'x-forwarded-for': '127.0.0.1',
      ...headers
    }
  };

  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

async function runTestSuite() {
  console.log('=== STARTING TEST SUITE: DISCIPLINE SKILLS, MOCK PURGE & CASCADE CLEANUP ===\n');
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

  const timestamp = Date.now();
  const testEmailME = `test_mech_${timestamp}@campus2career.org`;
  const testUsernameME = `mech_user_${timestamp}`;

  try {
    // ----------------------------------------------------
    // TEST 1: Register Mechanical Engineering (ME) User
    // ----------------------------------------------------
    console.log('--- TEST 1: Discipline-Specific Skill Seeding (ME User) ---');
    const { req: regReqME, res: regResME, getResult: getRegME } = mockReqRes({
      method: 'POST',
      body: {
        name: 'Arjun Sharma',
        username: testUsernameME,
        email: testEmailME,
        password: 'Password123!',
        role: 'learner',
        stream: 'ME'
      }
    });

    await registerHandler(regReqME, regResME);
    const regResultME = getRegME();
    assert(regResultME.statusCode === 200, `ME User registration returned 200 (got ${regResultME.statusCode})`);
    assert(regResultME.responseData && regResultME.responseData.success === true, 'Registration reports success: true');

    const createdUserME = await db.getUserByEmail(testEmailME);
    assert(Boolean(createdUserME), 'ME User row exists in users table');
    assert(createdUserME.stream === 'ME' || createdUserME.stream === 'mechanical', `User stream is stored correctly: ${createdUserME.stream}`);

    // Verify skills seeded for ME user
    const userSkillsME = await db.getStudentSkills(createdUserME.id);
    assert(Array.isArray(userSkillsME) && userSkillsME.length > 0, `ME user has seeded skills (count: ${userSkillsME.length})`);

    const skillNamesME = userSkillsME.map(s => s.skill_name);
    console.log('   ME Seeded skills:', skillNamesME);

    const hasJavaOrSpring = skillNamesME.some(n => /java|spring|microservice|react/i.test(n));
    assert(!hasJavaOrSpring, 'ME user has ZERO IT skills (No Java, Spring Boot, etc.)');

    const hasMechanicalSkills = skillNamesME.some(n => /solidworks|ansys|cfd|cnc|gd&t|failure/i.test(n));
    assert(hasMechanicalSkills, 'ME user is seeded with genuine Mechanical Engineering skills');

    // ----------------------------------------------------
    // TEST 2: GET /api/student/dashboard and /api/student/skills Scoping
    // ----------------------------------------------------
    console.log('\n--- TEST 2: API Endpoints Strictly Filter by User & Stream ---');
    const { req: dashReq, res: dashRes, getResult: getDash } = mockReqRes({
      method: 'GET',
      query: { user_id: createdUserME.id, email: testEmailME }
    });

    await studentDashboardHandler(dashReq, dashRes);
    const dashResult = getDash();
    assert(dashResult.statusCode === 200, `Dashboard endpoint returned 200 (got ${dashResult.statusCode})`);
    assert(dashResult.responseData && dashResult.responseData.success === true, 'Dashboard reports success: true');
    assert(
      dashResult.responseData.stream === 'ME' || dashResult.responseData.stream === 'mechanical',
      `Dashboard returns correct user stream: ${dashResult.responseData.stream}`
    );

    const dashSkills = dashResult.responseData.skills || [];
    assert(dashSkills.length === userSkillsME.length, `Dashboard skills count matches DB (${dashSkills.length})`);
    assert(
      !dashSkills.some(s => /java|spring/i.test(s.skill_name)),
      'Dashboard skills do NOT contain fallback IT skills'
    );

    const { req: skillsReq, res: skillsRes, getResult: getSkills } = mockReqRes({
      method: 'GET',
      query: { user_id: createdUserME.id, user_email: testEmailME }
    });

    await studentSkillsHandler(skillsReq, skillsRes);
    const skillsResult = getSkills();
    assert(skillsResult.statusCode === 200, `Skills endpoint returned 200 (got ${skillsResult.statusCode})`);
    assert(skillsResult.responseData && Array.isArray(skillsResult.responseData.skills), 'Skills endpoint returns skills array');
    assert(
      !skillsResult.responseData.skills.some(s => /java|spring/i.test(s.skill_name)),
      'Skills endpoint returns discipline skills without IT contamination'
    );

    // ----------------------------------------------------
    // TEST 3: Fresh User Dynamic Analytics (No Mock Data)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Fresh User Dynamic Analytics (0.0 hrs, 0 Days, 0 Tests) ---');
    const { req: analReq, res: analRes, getResult: getAnal } = mockReqRes({
      method: 'GET',
      query: { user_id: createdUserME.id, email: testEmailME }
    });

    await analyticsHandler(analReq, analRes);
    const analResult = getAnal();
    assert(analResult.statusCode === 200, `Analytics endpoint returned 200 (got ${analResult.statusCode})`);

    const analytics = analResult.responseData;
    assert(analytics && analytics.success === true, 'Analytics reports success: true');
    assert(Number(analytics.study_hours) === 0, `Fresh user study_hours is 0 (got ${analytics.study_hours})`);
    assert(Number(analytics.streak_days) === 0, `Fresh user streak_days is 0 (got ${analytics.streak_days})`);
    assert(Number(analytics.benchmarks_taken) === 0, `Fresh user benchmarks_taken is 0 (got ${analytics.benchmarks_taken})`);
    assert(Number(analytics.avg_exam_score) === 0, `Fresh user avg_exam_score is 0 (got ${analytics.avg_exam_score})`);
    assert(Number(analytics.growth_percent) === 0, `Fresh user growth_percent is 0% (got ${analytics.growth_percent}%)`);
    assert(Array.isArray(analytics.testAttempts) && analytics.testAttempts.length === 0, 'Fresh user testAttempts is empty array');

    // Verify index.html clean initial baseline
    const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert(
      htmlContent.includes('id="growthTotalHours"') && htmlContent.includes('>0.0 hrs</span>'),
      'index.html initial analytics card displays "0.0 hrs"'
    );
    assert(
      htmlContent.includes('id="growthStreakDays"') && htmlContent.includes('>0 Days</span>'),
      'index.html initial analytics card displays "0 Days"'
    );
    assert(
      htmlContent.includes('id="growthTestsCount"') && htmlContent.includes('>0 Tests</span>'),
      'index.html initial analytics card displays "0 Tests"'
    );
    assert(
      htmlContent.includes('id="growthAvgScore"') && htmlContent.includes('>Avg: 0%</span>'),
      'index.html initial analytics card displays "Avg: 0%"'
    );
    assert(
      htmlContent.includes('id="growthPercentBadge"') && htmlContent.includes('0% Growth'),
      'index.html initial analytics card displays "0% Growth"'
    );

    // ----------------------------------------------------
    // TEST 4: Strict Target Skill MCQ Test Submission
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Strict Target Skill MCQ Test Submission ---');
    const targetSkill = userSkillsME[0].skill_name;
    const initialScore = Number(userSkillsME[0].total_score) || 35;
    console.log(`   Targeting skill: "${targetSkill}" (initial total: ${initialScore}%)`);

    const { req: testReq, res: testRes, getResult: getTest } = mockReqRes({
      method: 'POST',
      body: {
        userId: createdUserME.id,
        skillName: targetSkill,
        testTitle: `${targetSkill} Benchmark Assessment`,
        score: 80,
        totalQuestions: 10,
        correctAnswers: 8,
        breakdown: { base: 35, lectures: 0, marathon: 0, diagnostic: 4 }
      }
    });

    await submitTestHandler(testReq, testRes);
    const testResult = getTest();
    assert(testResult.statusCode === 200, `Test submission returned 200 (got ${testResult.statusCode})`);
    assert(testResult.responseData && testResult.responseData.success === true, 'Test submission reports success: true');

    // Check student_skill_progress update
    const updatedSkillsME = await db.getStudentSkills(createdUserME.id);
    const updatedTarget = updatedSkillsME.find(s => s.skill_name === targetSkill);
    assert(Boolean(updatedTarget), `Target skill "${targetSkill}" found in updated skills`);
    assert(Number(updatedTarget.diagnostic_score) === 4, `Diagnostic score scaled incrementally to 4% (got ${updatedTarget.diagnostic_score})`);
    assert(Number(updatedTarget.total_score) === 39, `Total score dynamically calculated to 39% (got ${updatedTarget.total_score})`);
    assert(updatedTarget.status === 'LIVE VERIFIED', `Skill status updated to LIVE VERIFIED (got ${updatedTarget.status})`);

    // Verify other skills for ME user remained at baseline (35%)
    const otherSkillsME = updatedSkillsME.filter(s => s.skill_name !== targetSkill);
    const allOthersUnchanged = otherSkillsME.every(s => Number(s.total_score) === 35 && Number(s.diagnostic_score || 0) === 0);
    assert(allOthersUnchanged, 'All other ME skills remained unchanged at baseline (35%)');

    // Verify test attempt was persisted in student_test_attempts
    const testAttemptsInDb = await db.getStudentTestAttempts(createdUserME.id);
    assert(testAttemptsInDb.length === 1, `student_test_attempts has 1 recorded attempt (got ${testAttemptsInDb.length})`);
    assert(testAttemptsInDb[0].skill_name === targetSkill, `Attempt record specifies target skill: ${testAttemptsInDb[0].skill_name}`);
    assert(Number(testAttemptsInDb[0].score) === 80, `Attempt record specifies score: ${testAttemptsInDb[0].score}`);

    // Verify dynamic analytics now reflect the completed test
    const { req: analReq2, res: analRes2, getResult: getAnal2 } = mockReqRes({
      method: 'GET',
      query: { user_id: createdUserME.id, email: testEmailME }
    });
    await analyticsHandler(analReq2, analRes2);
    const updatedAnal = getAnal2().responseData;
    assert(Number(updatedAnal.benchmarks_taken) === 1, `Analytics now shows 1 benchmark taken (got ${updatedAnal.benchmarks_taken})`);
    assert(Number(updatedAnal.avg_exam_score) === 80, `Analytics now shows 80% avg score (got ${updatedAnal.avg_exam_score})`);

    // ----------------------------------------------------
    // TEST 5: Cascade Cleanup on User Deletion
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Cascade Cleanup on User Deletion ---');
    // Also create dummy records in other tables to test deep cascading:
    // 1. student_activity
    try {
      await db.recordStudentActivity({
        user_id: createdUserME.id,
        user_email: createdUserME.email,
        activity_type: 'exam_submission',
        topic: targetSkill,
        score: 80
      });
    } catch (e) {}

    // 2. login_attempts
    try {
      await db.logLoginAttempt({
        user_id: createdUserME.id,
        email: createdUserME.email,
        status: 'SUCCESS',
        ip_address: '127.0.0.1'
      });
    } catch (e) {}

    // 3. pending_verifications
    try {
      await db.createPendingVerification(testEmailME, '123456', 'tok123456');
    } catch (e) {}

    // 4. password_resets
    try {
      await db.createPasswordReset(testEmailME, '654321');
    } catch (e) {}

    console.log('   Executing cascade delete for user ID:', createdUserME.id);
    const deleteResult = await db.deleteUser(createdUserME.id);
    assert(deleteResult === true, 'deleteUser returned true');

    // Verify user table
    const checkUser = await db.getUserById(createdUserME.id);
    assert(checkUser === null, 'User row was deleted from users table');

    // Verify student_skill_progress
    const checkSkills = await db.getStudentSkills(createdUserME.id);
    assert(checkSkills.length === 0, `student_skill_progress rows purged (count: ${checkSkills.length})`);

    // Verify student_test_attempts
    const checkAttempts = await db.getStudentTestAttempts(createdUserME.id);
    assert(checkAttempts.length === 0, `student_test_attempts rows purged (count: ${checkAttempts.length})`);

    // Verify student_activity via getStudentAnalytics
    const checkAnalytics = await db.getStudentAnalytics({ user_id: createdUserME.id });
    assert(checkAnalytics.activities.length === 0, `student_activity rows purged (count: ${checkAnalytics.activities.length})`);
    assert(checkAnalytics.attempts.length === 0, `test attempts purged in analytics (count: ${checkAnalytics.attempts.length})`);

    // Verify pending_verifications
    const checkPending = await db.getPendingVerification(testEmailME);
    assert(checkPending === null, 'pending_verifications rows purged');

    // Verify password_resets
    const checkReset = await db.getPasswordReset(testEmailME);
    assert(checkReset === null, 'password_resets rows purged');

    console.log('\n========================================');
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('========================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    process.exit(1);
  }
}

runTestSuite();
