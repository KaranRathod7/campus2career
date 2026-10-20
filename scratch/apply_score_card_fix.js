const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const dbPath = path.join(__dirname, '..', 'api', '_handlers', 'db.js');
const activityPath = path.join(__dirname, '..', 'api', '_handlers', 'activity.js');

let indexHtml = fs.readFileSync(indexPath, 'utf8');
let dbJs = fs.readFileSync(dbPath, 'utf8');
let activityJs = fs.readFileSync(activityPath, 'utf8');

console.log('--- 1. Updating Initial HTML Target Stack Readiness Score Elements ---');
// Replace initial 70% in HTML with 35%
const oldOverallScoreHtml = `<span id="overallStackScore" class="text-4xl font-extrabold text-[#008080] font-mono">70%</span>`;
const newOverallScoreHtml = `<span id="overallStackScore" class="text-4xl font-extrabold text-[#008080] font-mono">35%</span>`;
if (indexHtml.includes(oldOverallScoreHtml)) {
  indexHtml = indexHtml.replace(oldOverallScoreHtml, newOverallScoreHtml);
  console.log('✓ Replaced #overallStackScore 70% with 35%');
} else {
  console.log('Notice: #overallStackScore 70% pattern not found or already replaced');
}

const oldRingPercent = `<span id="progressRingPercent" class="absolute text-[11px] font-black font-mono text-slate-800 dark:text-white">70%</span>`;
const newRingPercent = `<span id="progressRingPercent" class="absolute text-[11px] font-black font-mono text-slate-800 dark:text-white">35%</span>`;
if (indexHtml.includes(oldRingPercent)) {
  indexHtml = indexHtml.replace(oldRingPercent, newRingPercent);
  console.log('✓ Replaced #progressRingPercent 70% with 35%');
}

const oldRingOffset = `id="competenceProgressRing" class="text-teal-500 transition-all duration-700 ease-out" stroke-dasharray="100, 100" stroke-dashoffset="30"`;
const newRingOffset = `id="competenceProgressRing" class="text-teal-500 transition-all duration-700 ease-out" stroke-dasharray="100, 100" stroke-dashoffset="65"`;
if (indexHtml.includes(oldRingOffset)) {
  indexHtml = indexHtml.replace(oldRingOffset, newRingOffset);
  console.log('✓ Replaced #competenceProgressRing offset with 65');
}

const oldOverallBar = `<div id="overallProgressBar" class="bg-[#008080] h-2 rounded-full transition-all duration-500" style="width: 70%"></div>`;
const newOverallBar = `<div id="overallProgressBar" class="bg-[#008080] h-2 rounded-full transition-all duration-500" style="width: 35%"></div>`;
if (indexHtml.includes(oldOverallBar)) {
  indexHtml = indexHtml.replace(oldOverallBar, newOverallBar);
  console.log('✓ Replaced #overallProgressBar style="width: 70%" with 35%');
}

console.log('--- 2. Updating calculateSkillBreakdown & removing duplicate calculateCompositeSkillScore ---');
// Check calculateSkillBreakdown
const oldBreakdownHead = `    function calculateSkillBreakdown(skill) {
      if (!skill) return { baseScore: 20, videoCredit: 0, marathonBonus: 0, testBonus: 0, total: 20, completedLessonsCount: 0, hasMarathon: false };

      // 1. Unverified Starting Baseline: Strictly capped at 48% max (20% Beginner, 35% Intermediate, 48% Advanced)
      let baseScore = skill.baseScore !== undefined ? skill.baseScore : skill.base_percentage;`;

const newBreakdownHead = `    function calculateSkillBreakdown(skill) {
      if (!skill) return { baseScore: 20, videoCredit: 0, marathonBonus: 0, testBonus: 0, total: 20, completedLessonsCount: 0, hasMarathon: false };

      // 1. Unverified Starting Baseline: Strictly capped at 48% max (20% Beginner, 35% Intermediate, 48% Advanced)
      let baseScore = skill.baseScore !== undefined ? skill.baseScore : (skill.base_percentage !== undefined ? skill.base_percentage : skill.base);`;

if (indexHtml.includes(oldBreakdownHead)) {
  indexHtml = indexHtml.replace(oldBreakdownHead, newBreakdownHead);
  console.log('✓ calculateSkillBreakdown supports skill.base');
}

// Ensure videoCredit, marathonBonus, testBonus respect direct overrides if provided
const oldVideoCredit = `      const videoCredit = Math.min(15, completedLessonsCount); // Linear 1% per unique completed lecture, max 15%`;
const newVideoCredit = `      const videoCredit = (skill.lecture_score !== undefined && skill.lecture_score !== null)
        ? Math.min(15, Math.max(0, Number(skill.lecture_score)))
        : Math.min(15, completedLessonsCount); // Linear 1% per unique completed lecture, max 15%`;
if (indexHtml.includes(oldVideoCredit)) {
  indexHtml = indexHtml.replace(oldVideoCredit, newVideoCredit);
  console.log('✓ calculateSkillBreakdown respects skill.lecture_score');
}

const oldMarathon = `      const marathonBonus = hasMarathon ? 3 : 0;`;
const newMarathon = `      const marathonBonus = (skill.marathon_score !== undefined && skill.marathon_score !== null)
        ? Math.min(3, Math.max(0, Number(skill.marathon_score)))
        : (hasMarathon ? 3 : 0);`;
if (indexHtml.includes(oldMarathon)) {
  indexHtml = indexHtml.replace(oldMarathon, newMarathon);
  console.log('✓ calculateSkillBreakdown respects skill.marathon_score');
}

// Replace duplicate old calculateCompositeSkillScore at line 27177
const oldCompFn = `    // COMPOSITE SKILL EVALUATION FORMULA:
    // Base Score (20% - 48%) + Video Lecture Completion (Max 20%) + Marathon Revision Bonus (+3%) + Benchmark Tests (Remaining up to 100%)
    function calculateCompositeSkillScore(skill) {
      if (!skill) return 20;
      if (!skill.baseScore) skill.baseScore = skill.score || 20;

      // 1. Video completion credit (up to 20% max)
      const skillId = skill.id;
      const completedList = (appState.progress && appState.progress.completedLessonsBySkill && appState.progress.completedLessonsBySkill[skillId]) || [];
      const videoCredit = Math.min(20, Math.round((completedList.length / 15) * 20));

      // 2. Marathon revision bonus (+3%)
      const streamKey = getActiveStreamKey();
      const hasMarathon = Boolean(appState.progress && appState.progress.completedMarathons && appState.progress.completedMarathons[streamKey]);
      const marathonBonus = hasMarathon ? 3 : 0;

      // 3. Benchmark test adjustment
      const skillTests = (appState.mcqHistory || []).filter(h => 
        h.module.toLowerCase().includes(skill.name.split(' ')[0].toLowerCase()) ||
        skill.name.toLowerCase().includes(h.module.split(' ')[0].toLowerCase())
      );

      let testBonus = 0;
      if (skillTests.length > 0) {
        const latest = skillTests[skillTests.length - 1];
        if (latest.score >= 80) {
          testBonus = Math.round((latest.score - 70) * 0.6); // up to +18%
        } else if (latest.score < 50) {
          testBonus = -Math.round((50 - latest.score) * 0.3); // negative adjustment
        } else {
          testBonus = 3;
        }
      }

      const total = skill.baseScore + videoCredit + marathonBonus + testBonus;
      return Math.min(100, Math.max(20, total));
    }`;

const newCompFn = `    // COMPOSITE SKILL EVALUATION FORMULA (Unified with calculateSkillBreakdown):
    function calculateCompositeSkillScore(skill) {
      return calculateSkillBreakdown(skill).total;
    }`;

if (indexHtml.includes(oldCompFn)) {
  indexHtml = indexHtml.replace(oldCompFn, newCompFn);
  console.log('✓ Replaced outdated calculateCompositeSkillScore definition with unified breakdown call');
}

console.log('--- 3. Refactoring renderSkillLevelDiagram to Dynamically Compute Card Scores ---');

const oldRenderFunction = `    function renderSkillLevelDiagram() {
      checkGuestEvaluationBanner();
      const container = document.getElementById('skillGaugesContainer');
      const pillsContainer = document.getElementById('activeStackPills');
      if (!container) return;

      container.innerHTML = '';
      if (pillsContainer) pillsContainer.innerHTML = '';

      // Check if user has any verified test scores
      const hasVerifiedTests = appState.mcqHistory && appState.mcqHistory.some(h => h.passed && h.score >= 80);

      // Render Active Stack Pills
      appState.currentStack.forEach((skill, idx) => {
        if (pillsContainer) {
          const pill = document.createElement('span');
          pill.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-[#008080] border border-teal-200 flex items-center";
          pill.innerHTML = \`<span>\${skill.name}</span> <span class="ml-1.5 text-[10px] opacity-75">(\${skill.score}%)</span>\`;
          pillsContainer.appendChild(pill);
        }

        const bd = calculateSkillBreakdown(skill);
        const tier = getSkillTier(skill.score);
        const skillFusion = getFusionColor(skill.score);
        const card = document.createElement('div');
        const isSkillVerified = (skill.score >= 80) || skill.status === 'LIVE VERIFIED' || Boolean(skill.verified);

        card.className = "bg-white dark:bg-[#0F172A] p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-4";
        card.innerHTML = \`
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-xs font-bold text-slate-900 dark:text-white">\${skill.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded \${skill.category && skill.category.includes('Leadership') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">\${skill.category || 'Core Skill'}</span>
                \${isSkillVerified ? \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                    <i class="fa-solid fa-circle-check mr-1"></i> LIVE VERIFIED (\${skill.score}%)
                  </span>
                \` : \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                    <i class="fa-solid fa-clock mr-1"></i> \${skill.status || \`UNVERIFIED BASELINE (\${skill.score}%)\`}
                  </span>
                \`}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                \${isSkillVerified ? 'Verified competence via 10-MCQ Industrial Benchmark exam.' : 'Initial baseline calibration. Take the 10-MCQ benchmark exam to unlock verified scores (>50% to 100%).'}
              </p>
            </div>

            <!-- Level Gauge Badge (Prominent Big Font Percentage) -->
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-xl sm:text-2xl font-mono font-black \${tier.badgeBg} px-3 py-1 rounded-xl border shadow-xs tracking-tight">
                \${skill.score}%
              </span>
            </div>
          </div>

          <!-- Progress Bar with milestone ticks and fusion color -->
          <div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="h-full rounded-full transition-all duration-500" style="width: \${skill.score}%; background-color: \${skillFusion.hex}"></div>
            </div>
            <div class="flex flex-wrap justify-between gap-x-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              <span>Beginner (20%)</span>
              <span>Intermediate (35%)</span>
              <span>Advanced (48%)</span>
              <span>Master (100%)</span>
            </div>
          </div>

          <!-- TRANSPARENT COMPOSITE EVALUATION FORMULA BREAKDOWN PILL -->
          <div class="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div class="flex items-center space-x-2 flex-wrap text-slate-600 dark:text-slate-300">
              <span>Base: <strong class="text-slate-900 dark:text-white">\${bd.baseScore}%</strong></span>
              <span>&bull;</span>
              <span class="\${bd.videoCredit > 0 ? 'text-teal-600 dark:text-teal-400 font-bold' : ''}">Lectures: <strong>+\${bd.videoCredit}%/15%</strong> (\${bd.completedLessonsCount}/15)</span>
              <span>&bull;</span>
              <span class="\${bd.marathonBonus > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}">Marathon: <strong>+\${bd.marathonBonus}%/3%</strong></span>
              <span>&bull;</span>
              <span class="\${bd.testBonus > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}">Diagnostic: <strong>+\${bd.testBonus}%/34%</strong></span>
            </div>
            <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">\${skill.score}%</span>
            </div>
          </div>

          <!-- Milestones & Diagnostic (Stacks vertically on small screens) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Milestone Achieved:</span>
              <p class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">\${skill.currentMilestone || 'Fundamental syntax & baseline concepts'}</p>
            </div>
            <div class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
              <span class="text-[10px] font-bold text-[#008080] dark:text-teal-400 uppercase tracking-wider block mb-1">Next Milestone to Level Up:</span>
              <p class="text-teal-950 dark:text-teal-200 font-medium leading-relaxed">\${skill.nextMilestone || 'Production architecture & high-throughput concurrency'}</p>
            </div>
          </div>

          <!-- ACTIONS: Full width touch-friendly buttons on mobile -->
          <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-medium text-slate-500 flex items-center">
              <i class="fa-solid fa-lock text-slate-400 mr-1.5 text-[10px]"></i>
              <span>Baseline Level:</span>
              <span class="ml-1 font-bold \${tier.twText}">\${tier.name} (\${skill.score}%)</span>
              <span class="ml-1.5 text-[10px] text-slate-400 italic hidden sm:inline">(Locked &bull; Evaluated via 10-MCQ)</span>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button onclick="openSkillResourceViewer('\${skill.id}')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer">
                <i class="fa-brands fa-youtube"></i>
                <span>Study Video Playlist</span>
              </button>
              <button onclick="navigateTo('mcq')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center cursor-pointer">
                \${isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;'}
              </button>
            </div>
          </div>
        \`;
        container.appendChild(card);
      });

      // Update Overall Score Card with dynamic fusion color (Red 20% -> Yellow 48% -> Green 100%)
      const overallScoreEl = document.getElementById('overallStackScore');
      const overallBarEl = document.getElementById('overallProgressBar');
      const overallInsightEl = document.getElementById('overallInsightText');

      if (overallScoreEl && appState.currentStack.length > 0) {
        const rawAvg = Math.round(appState.currentStack.reduce((acc, s) => acc + (s.score || 35), 0) / appState.currentStack.length);
        const finalScore = rawAvg;
        const overallFusion = getFusionColor(finalScore);

        overallScoreEl.innerText = \`\${finalScore}%\`;
        overallScoreEl.style.color = overallFusion.hex;
        if (overallBarEl) {
          overallBarEl.style.width = \`\${finalScore}%\`;
          overallBarEl.style.backgroundColor = overallFusion.hex;
        }

        const ringEl = document.getElementById('competenceProgressRing');
        const ringPercentEl = document.getElementById('progressRingPercent');
        if (ringEl) {
          const dashOffset = Math.max(0, Math.min(100, 100 - finalScore));
          ringEl.style.strokeDashoffset = dashOffset;
          ringEl.setAttribute('stroke-dashoffset', dashOffset.toString());
          ringEl.style.color = overallFusion.hex;
        }
        if (ringPercentEl) {
          ringPercentEl.innerText = \`\${finalScore}%\`;
          ringPercentEl.style.color = overallFusion.hex;
        }

        if (overallInsightEl) {
          if (appState.user && appState.user.dynamic_competence_percent !== undefined) {
            overallInsightEl.innerHTML = \`Dynamic competence: <strong>\${finalScore}%</strong> based on verified study time, lecture hours, and benchmark exams. Reaching Level 4 (&ge;75%) qualifies you for top verified talent cohorts.\`;
          } else if (hasVerifiedTests) {
            overallInsightEl.innerHTML = \`Your verified score is <strong>\${displayScore}%</strong>. Verified scores &ge;80% in all core skills qualify you for verified monthly talent cohorts and direct recruiter invitations.\`;
          } else {
            overallInsightEl.innerHTML = \`Your score is calibrated at an unverified baseline of <strong>\${displayScore}%</strong>. Take 10-MCQ benchmark exams to verify competence and unlock higher verified tiers.\`;
          }
        }
      }`;

const newRenderFunction = `    function renderSkillLevelDiagram() {
      checkGuestEvaluationBanner();
      const container = document.getElementById('skillGaugesContainer');
      const pillsContainer = document.getElementById('activeStackPills');
      if (!container) return;

      container.innerHTML = '';
      if (pillsContainer) pillsContainer.innerHTML = '';

      // Check if user has any verified test scores
      const hasVerifiedTests = appState.mcqHistory && appState.mcqHistory.some(h => h.passed && h.score >= 80);

      // Render Active Stack Pills
      appState.currentStack.forEach((skill, idx) => {
        const bd = calculateSkillBreakdown(skill);

        // Dynamically compute the total score on the fly
        const baseScore = Number(skill.base_percentage || skill.base || bd.baseScore || 35);
        const lectureScore = Number(skill.lecture_score !== undefined ? skill.lecture_score : (bd.videoCredit || 0));
        const marathonScore = Number(skill.marathon_score !== undefined ? skill.marathon_score : (bd.marathonBonus || 0));
        const testScore = Number(skill.test_score !== undefined ? skill.test_score : (bd.testBonus || 0));

        const calculatedTotal = Math.min(100, Math.max(20, baseScore + lectureScore + marathonScore + testScore));

        // Keep skill.score strictly in sync with dynamic total
        skill.score = calculatedTotal;

        if (pillsContainer) {
          const pill = document.createElement('span');
          pill.className = "px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-[#008080] border border-teal-200 flex items-center";
          pill.innerHTML = \`<span>\${skill.name}</span> <span class="ml-1.5 text-[10px] opacity-75">(\${calculatedTotal}%)</span>\`;
          pillsContainer.appendChild(pill);
        }

        const tier = getSkillTier(calculatedTotal);
        const skillFusion = getFusionColor(calculatedTotal);
        const card = document.createElement('div');
        const isSkillVerified = (calculatedTotal >= 80) || skill.status === 'LIVE VERIFIED' || Boolean(skill.verified);

        card.className = "bg-white dark:bg-[#0F172A] p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-4";
        card.innerHTML = \`
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-xs font-bold text-slate-900 dark:text-white">\${skill.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded \${skill.category && skill.category.includes('Leadership') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">\${skill.category || 'Core Skill'}</span>
                \${isSkillVerified ? \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                    <i class="fa-solid fa-circle-check mr-1"></i> LIVE VERIFIED (\${calculatedTotal}%)
                  </span>
                \` : \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                    <i class="fa-solid fa-clock mr-1"></i> \${skill.status && !skill.status.includes('(') ? \`\${skill.status} (\${calculatedTotal}%)\` : (skill.status || \`UNVERIFIED BASELINE (\${calculatedTotal}%)\`)}
                  </span>
                \`}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                \${isSkillVerified ? 'Verified competence via 10-MCQ Industrial Benchmark exam.' : 'Initial baseline calibration. Take the 10-MCQ benchmark exam to unlock verified scores (>50% to 100%).'}
              </p>
            </div>

            <!-- Level Gauge Badge (Prominent Big Font Percentage) -->
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-xl sm:text-2xl font-mono font-black \${tier.badgeBg} px-3 py-1 rounded-xl border shadow-xs tracking-tight">
                \${calculatedTotal}%
              </span>
            </div>
          </div>

          <!-- Progress Bar with milestone ticks and fusion color -->
          <div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="h-full rounded-full transition-all duration-500" style="width: \${calculatedTotal}%; background-color: \${skillFusion.hex}"></div>
            </div>
            <div class="flex flex-wrap justify-between gap-x-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              <span>Beginner (20%)</span>
              <span>Intermediate (35%)</span>
              <span>Advanced (48%)</span>
              <span>Master (100%)</span>
            </div>
          </div>

          <!-- TRANSPARENT COMPOSITE EVALUATION FORMULA BREAKDOWN PILL -->
          <div class="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div class="flex items-center space-x-2 flex-wrap text-slate-600 dark:text-slate-300">
              <span>Base: <strong class="text-slate-900 dark:text-white">\${baseScore}%</strong></span>
              <span>&bull;</span>
              <span class="\${lectureScore > 0 ? 'text-teal-600 dark:text-teal-400 font-bold' : ''}">Lectures: <strong>+\${lectureScore}%/15%</strong> (\${bd.completedLessonsCount}/15)</span>
              <span>&bull;</span>
              <span class="\${marathonScore > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}">Marathon: <strong>+\${marathonScore}%/3%</strong></span>
              <span>&bull;</span>
              <span class="\${testScore > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}">Diagnostic: <strong>+\${testScore}%/34%</strong></span>
            </div>
            <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">\${calculatedTotal}%</span>
            </div>
          </div>

          <!-- Milestones & Diagnostic (Stacks vertically on small screens) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Milestone Achieved:</span>
              <p class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">\${skill.currentMilestone || 'Fundamental syntax & baseline concepts'}</p>
            </div>
            <div class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
              <span class="text-[10px] font-bold text-[#008080] dark:text-teal-400 uppercase tracking-wider block mb-1">Next Milestone to Level Up:</span>
              <p class="text-teal-950 dark:text-teal-200 font-medium leading-relaxed">\${skill.nextMilestone || 'Production architecture & high-throughput concurrency'}</p>
            </div>
          </div>

          <!-- ACTIONS: Full width touch-friendly buttons on mobile -->
          <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-medium text-slate-500 flex items-center">
              <i class="fa-solid fa-lock text-slate-400 mr-1.5 text-[10px]"></i>
              <span>Baseline Level:</span>
              <span class="ml-1 font-bold \${tier.twText}">\${tier.name} (\${calculatedTotal}%)</span>
              <span class="ml-1.5 text-[10px] text-slate-400 italic hidden sm:inline">(Locked &bull; Evaluated via 10-MCQ)</span>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button onclick="openSkillResourceViewer('\${skill.id}')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer">
                <i class="fa-brands fa-youtube"></i>
                <span>Study Video Playlist</span>
              </button>
              <button onclick="navigateTo('mcq')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center cursor-pointer">
                \${isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;'}
              </button>
            </div>
          </div>
        \`;
        container.appendChild(card);
      });

      // Update Overall Score Card with dynamic fusion color (Red 20% -> Yellow 48% -> Green 100%)
      const overallScoreEl = document.getElementById('overallStackScore');
      const overallBarEl = document.getElementById('overallProgressBar');
      const overallInsightEl = document.getElementById('overallInsightText');

      if (overallScoreEl && appState.currentStack.length > 0) {
        // Arithmetic mean of all active skills' calculated totals
        const totalSum = appState.currentStack.reduce((acc, s) => {
          const b = calculateSkillBreakdown(s);
          const bScore = Number(s.base_percentage || s.base || b.baseScore || 35);
          const lScore = Number(s.lecture_score !== undefined ? s.lecture_score : (b.videoCredit || 0));
          const mScore = Number(s.marathon_score !== undefined ? s.marathon_score : (b.marathonBonus || 0));
          const tScore = Number(s.test_score !== undefined ? s.test_score : (b.testBonus || 0));
          return acc + Math.min(100, Math.max(20, bScore + lScore + mScore + tScore));
        }, 0);
        const finalScore = Math.round(totalSum / appState.currentStack.length);
        const overallFusion = getFusionColor(finalScore);

        overallScoreEl.innerText = \`\${finalScore}%\`;
        overallScoreEl.style.color = overallFusion.hex;
        if (overallBarEl) {
          overallBarEl.style.width = \`\${finalScore}%\`;
          overallBarEl.style.backgroundColor = overallFusion.hex;
        }

        const ringEl = document.getElementById('competenceProgressRing');
        const ringPercentEl = document.getElementById('progressRingPercent');
        if (ringEl) {
          const dashOffset = Math.max(0, Math.min(100, 100 - finalScore));
          ringEl.style.strokeDashoffset = dashOffset;
          ringEl.setAttribute('stroke-dashoffset', dashOffset.toString());
          ringEl.style.color = overallFusion.hex;
        }
        if (ringPercentEl) {
          ringPercentEl.innerText = \`\${finalScore}%\`;
          ringPercentEl.style.color = overallFusion.hex;
        }

        if (overallInsightEl) {
          if (hasVerifiedTests) {
            overallInsightEl.innerHTML = \`Your verified score is <strong>\${finalScore}%</strong>. Verified scores &ge;80% in all core skills qualify you for verified monthly talent cohorts and direct recruiter invitations.\`;
          } else {
            overallInsightEl.innerHTML = \`Your score is calibrated at an unverified baseline of <strong>\${finalScore}%</strong>. Take 10-MCQ benchmark exams to verify competence and unlock higher verified tiers.\`;
          }
        }
      }`;

if (indexHtml.includes(oldRenderFunction)) {
  indexHtml = indexHtml.replace(oldRenderFunction, newRenderFunction);
  console.log('✓ Successfully refactored renderSkillLevelDiagram with dynamic card score calculation and readiness mean');
} else {
  console.error('ERROR: oldRenderFunction string did not match indexHtml! Checking normalized newlines...');
  // Try CRLF normalize
  const normIndex = indexHtml.replace(/\r\n/g, '\n');
  const normOld = oldRenderFunction.replace(/\r\n/g, '\n');
  if (normIndex.includes(normOld)) {
    indexHtml = normIndex.replace(normOld, newRenderFunction).replace(/\n/g, '\r\n');
    console.log('✓ Successfully refactored renderSkillLevelDiagram using normalized newlines');
  } else {
    console.error('FATAL: Could not locate oldRenderFunction even with normalized newlines!');
  }
}

console.log('--- 4. Updating runLiveRecalculations ---');
const oldRecalc = `    function runLiveRecalculations() {
      if (!appState.currentStack || appState.currentStack.length === 0) return;
      const totalScore = appState.currentStack.reduce((acc, s) => acc + s.score, 0);
      const avg = Math.round(totalScore / appState.currentStack.length);

      const hasVerifiedTests = appState.mcqHistory && appState.mcqHistory.some(h => h.passed && h.score >= 80);
      const displayScore = hasVerifiedTests ? avg : Math.min(avg, 48);
      const compScore = (appState.user && appState.user.dynamic_competence_percent !== undefined)
        ? Math.round(Number(appState.user.dynamic_competence_percent))
        : displayScore;
      const fusion = getFusionColor(compScore);

      const scoreEl = document.getElementById('overallStackScore');
      const barEl = document.getElementById('overallProgressBar');
      const insightEl = document.getElementById('overallInsightText');
      const ringEl = document.getElementById('competenceProgressRing');
      const ringPercentEl = document.getElementById('progressRingPercent');

      if (scoreEl) {
        scoreEl.innerText = \`\${compScore}%\`;
        scoreEl.style.color = fusion.hex;
      }
      if (barEl) {
        barEl.style.width = \`\${compScore}%\`;
        barEl.style.backgroundColor = fusion.hex;
      }
      if (ringEl) {
        const dashOffset = Math.max(0, Math.min(100, 100 - compScore));
        ringEl.style.strokeDashoffset = dashOffset;
        ringEl.setAttribute('stroke-dashoffset', dashOffset.toString());
        ringEl.style.color = fusion.hex;
      }
      if (ringPercentEl) {
        ringPercentEl.innerText = \`\${compScore}%\`;
        ringPercentEl.style.color = fusion.hex;
      }`;

const newRecalc = `    function runLiveRecalculations() {
      if (!appState.currentStack || appState.currentStack.length === 0) return;
      const totalSum = appState.currentStack.reduce((acc, s) => {
        const b = calculateSkillBreakdown(s);
        const bScore = Number(s.base_percentage || s.base || b.baseScore || 35);
        const lScore = Number(s.lecture_score !== undefined ? s.lecture_score : (b.videoCredit || 0));
        const mScore = Number(s.marathon_score !== undefined ? s.marathon_score : (b.marathonBonus || 0));
        const tScore = Number(s.test_score !== undefined ? s.test_score : (b.testBonus || 0));
        const tot = Math.min(100, Math.max(20, bScore + lScore + mScore + tScore));
        s.score = tot;
        return acc + tot;
      }, 0);
      const avg = Math.round(totalSum / appState.currentStack.length);

      const hasVerifiedTests = appState.mcqHistory && appState.mcqHistory.some(h => h.passed && h.score >= 80);
      const displayScore = hasVerifiedTests ? avg : Math.min(avg, 48);
      const compScore = displayScore;
      const fusion = getFusionColor(compScore);

      const scoreEl = document.getElementById('overallStackScore');
      const barEl = document.getElementById('overallProgressBar');
      const insightEl = document.getElementById('overallInsightText');
      const ringEl = document.getElementById('competenceProgressRing');
      const ringPercentEl = document.getElementById('progressRingPercent');

      if (scoreEl) {
        scoreEl.innerText = \`\${compScore}%\`;
        scoreEl.style.color = fusion.hex;
      }
      if (barEl) {
        barEl.style.width = \`\${compScore}%\`;
        barEl.style.backgroundColor = fusion.hex;
      }
      if (ringEl) {
        const dashOffset = Math.max(0, Math.min(100, 100 - compScore));
        ringEl.style.strokeDashoffset = dashOffset;
        ringEl.setAttribute('stroke-dashoffset', dashOffset.toString());
        ringEl.style.color = fusion.hex;
      }
      if (ringPercentEl) {
        ringPercentEl.innerText = \`\${compScore}%\`;
        ringPercentEl.style.color = fusion.hex;
      }
      if (insightEl) {
        if (hasVerifiedTests) {
          insightEl.innerHTML = \`Your verified score is <strong>\${compScore}%</strong>. Verified scores &ge;80% in all core skills qualify you for verified monthly talent cohorts and direct recruiter invitations.\`;
        } else {
          insightEl.innerHTML = \`Your score is calibrated at an unverified baseline of <strong>\${compScore}%</strong>. Take 10-MCQ benchmark exams to verify competence and unlock higher verified tiers.\`;
        }
      }`;

const normIndex2 = indexHtml.replace(/\r\n/g, '\n');
const normRecalc = oldRecalc.replace(/\r\n/g, '\n');
if (normIndex2.includes(normRecalc)) {
  indexHtml = normIndex2.replace(normRecalc, newRecalc).replace(/\n/g, '\r\n');
  console.log('✓ Successfully updated runLiveRecalculations');
} else {
  console.log('Notice: oldRecalc pattern not found or already updated');
}

console.log('--- 5. Updating loadStateFromStorage and applyPresetStack Sanitization ---');
const oldLoadStack = `        const storedStack = localStorage.getItem(STORAGE_KEY_STACK);
        appState.currentStack = storedStack ? JSON.parse(storedStack) : JSON.parse(JSON.stringify(defSkills));`;

const newLoadStack = `        const storedStack = localStorage.getItem(STORAGE_KEY_STACK);
        appState.currentStack = storedStack ? JSON.parse(storedStack) : JSON.parse(JSON.stringify(defSkills));
        // Sanitize legacy stored skills against dynamic score calculation
        if (Array.isArray(appState.currentStack)) {
          const hasVerifiedTests = appState.mcqHistory && appState.mcqHistory.some(h => h.passed && h.score >= 80);
          appState.currentStack.forEach(s => {
            const bd = calculateSkillBreakdown(s);
            if (!hasVerifiedTests && !s.verified && s.status !== 'LIVE VERIFIED') {
              s.score = bd.total;
            }
          });
        }`;

const normIndex3 = indexHtml.replace(/\r\n/g, '\n');
const normLoad = oldLoadStack.replace(/\r\n/g, '\n');
if (normIndex3.includes(normLoad)) {
  indexHtml = normIndex3.replace(normLoad, newLoadStack).replace(/\n/g, '\r\n');
  console.log('✓ Successfully added legacy localStorage stack sanitization');
}

console.log('--- 6. Updating STACK_PRESETS mock default values (72, 65 -> 35) ---');
const oldPresetsJava = `      java: [
        { id: 'java', name: 'Java & Multithreading', score: 72, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
        { id: 'spring', name: 'Spring Boot & Microservices', score: 65, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 60, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & Containers', score: 78, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'debug', name: 'Production Debugging', score: 55, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],`;

const newPresetsJava = `      java: [
        { id: 'java', name: 'Java & Multithreading', score: 35, base_percentage: 35, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
        { id: 'spring', name: 'Spring Boot & Microservices', score: 35, base_percentage: 35, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
        { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
        { id: 'docker', name: 'Docker & Containers', score: 35, base_percentage: 35, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
        { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
      ],`;

const normIndex4 = indexHtml.replace(/\r\n/g, '\n');
const normJava = oldPresetsJava.replace(/\r\n/g, '\n');
if (normIndex4.includes(normJava)) {
  indexHtml = normIndex4.replace(normJava, newPresetsJava).replace(/\n/g, '\r\n');
  console.log('✓ Successfully updated STACK_PRESETS.java initial scores to 35');
}

// Also update STREAM_DATA.it.presets.java_cloud.skills and STREAM_DATA.cse.presets.java_backend.skills
const oldItJava = `        skills: [
          { id: 'java', name: 'Java & Multithreading', score: 72, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
          { id: 'spring', name: 'Spring Boot & Microservices', score: 65, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
          { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 60, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { id: 'docker', name: 'Docker & Containers', score: 78, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
          { id: 'debug', name: 'Production Debugging', score: 55, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
        ]`;

const newItJava = `        skills: [
          { id: 'java', name: 'Java & Multithreading', score: 35, base_percentage: 35, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
          { id: 'spring', name: 'Spring Boot & Microservices', score: 35, base_percentage: 35, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
          { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { id: 'docker', name: 'Docker & Containers', score: 35, base_percentage: 35, category: 'Cloud Infra', currentMilestone: 'Multi-stage builds & Distroless images', nextMilestone: 'Kubernetes Pod Deployment & Helm', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
          { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
        ]`;

const normIndex5 = indexHtml.replace(/\r\n/g, '\n');
const normIt = oldItJava.replace(/\r\n/g, '\n');
if (normIndex5.includes(normIt)) {
  indexHtml = normIndex5.replace(normIt, newItJava).replace(/\n/g, '\r\n');
  console.log('✓ Successfully updated STREAM_DATA.it.presets.java_cloud.skills initial scores to 35');
}

const oldCseJava = `        skills: [
          { id: 'java', name: 'Java & Multithreading', score: 72, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
          { id: 'spring', name: 'Spring Boot & Microservices', score: 65, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
          { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 60, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { id: 'kafka', name: 'Apache Kafka Event Streaming', score: 58, category: 'Messaging', currentMilestone: 'Topics, Partitions & Consumer groups', nextMilestone: 'Exactly-once semantics (EOS) & consumer rebalancing', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
          { id: 'debug', name: 'Production Debugging', score: 55, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
        ]`;

const newCseJava = `        skills: [
          { id: 'java', name: 'Java & Multithreading', score: 35, base_percentage: 35, category: 'Backend Language', currentMilestone: 'Collections, Streams, Multithreading & OOP', nextMilestone: 'JVM Memory Tuning & Low-latency locks', youtubeUrl: 'https://www.youtube.com/watch?v=grEKMHGYyns' },
          { id: 'spring', name: 'Spring Boot & Microservices', score: 35, base_percentage: 35, category: 'Architecture', currentMilestone: 'REST APIs, JPA Entities & Dependency Injection', nextMilestone: 'Distributed Sagas & Circuit Breakers', youtubeUrl: 'https://www.youtube.com/watch?v=9SGDpanrc8U' },
          { id: 'postgres', name: 'PostgreSQL & SQL Tuning', score: 35, base_percentage: 35, category: 'Databases', currentMilestone: 'Complex SQL, Transactions & Foreign Keys', nextMilestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE', youtubeUrl: 'https://www.youtube.com/watch?v=HubezKbFL7E' },
          { id: 'kafka', name: 'Apache Kafka Event Streaming', score: 35, base_percentage: 35, category: 'Messaging', currentMilestone: 'Topics, Partitions & Consumer groups', nextMilestone: 'Exactly-once semantics (EOS) & consumer rebalancing', youtubeUrl: 'https://www.youtube.com/watch?v=cuHDQhDhvPE' },
          { id: 'debug', name: 'Production Debugging', score: 35, base_percentage: 35, category: 'Problem Solving', currentMilestone: 'Stack trace diagnosis & unit test mocks', nextMilestone: 'Heap dump analysis & connection leak profiling', youtubeUrl: 'https://www.youtube.com/watch?v=y62zj9ozPOM' }
        ]`;

const normIndex6 = indexHtml.replace(/\r\n/g, '\n');
const normCse = oldCseJava.replace(/\r\n/g, '\n');
if (normIndex6.includes(normCse)) {
  indexHtml = normIndex6.replace(normCse, newCseJava).replace(/\n/g, '\r\n');
  console.log('✓ Successfully updated STREAM_DATA.cse.presets.java_backend.skills initial scores to 35');
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('✓ Wrote updated index.html successfully!');

console.log('--- 7. Updating api/_handlers/db.js readinessScore defaults (75 -> 35) ---');
// Replace readinessScore initializations and schema defaults
dbJs = dbJs.replace(/readiness_score NUMERIC\(5,2\) DEFAULT 75/g, 'readiness_score NUMERIC(5,2) DEFAULT 35');
dbJs = dbJs.replace(/competence_rating NUMERIC\(5,2\) DEFAULT 75/g, 'competence_rating NUMERIC(5,2) DEFAULT 35');
dbJs = dbJs.replace(/DEFAULT 75;/g, 'DEFAULT 35;');

// In getStudentAnalytics:
const oldDbAnalytics = `    if (activities.length === 0) {
      const store = getLocalStore();
      activities = (store.student_activity || []).filter(a => 
        (user_id && a.user_id === user_id) || 
        (user_email && a.user_email && a.user_email.toLowerCase() === (user_email || '').toLowerCase())
      );
      if (store.candidates) {
        const cand = store.candidates.find(c => (user_id && c.user_id === user_id) || (user_email && c.email && c.email.toLowerCase() === (user_email || '').toLowerCase()));
        if (cand) {
          readinessScore = Number(cand.readiness_score) || Number(cand.skill_score) || 75;
        }
      }
    }`;

const newDbAnalytics = `    if (activities.length === 0) {
      const store = getLocalStore();
      activities = (store.student_activity || []).filter(a => 
        (user_id && a.user_id === user_id) || 
        (user_email && a.user_email && a.user_email.toLowerCase() === (user_email || '').toLowerCase())
      );
      if (store.candidates) {
        const cand = store.candidates.find(c => (user_id && c.user_id === user_id) || (user_email && c.email && c.email.toLowerCase() === (user_email || '').toLowerCase()));
        if (cand) {
          readinessScore = Number(cand.readiness_score) || Number(cand.skill_score) || 35;
        }
      }
    }`;

const normDb = dbJs.replace(/\r\n/g, '\n');
const normDbAna = oldDbAnalytics.replace(/\r\n/g, '\n');
if (normDb.includes(normDbAna)) {
  dbJs = normDb.replace(normDbAna, newDbAnalytics).replace(/\n/g, '\r\n');
  console.log('✓ Updated getStudentAnalytics local candidate fallback in db.js');
}

// In getStudentAnalytics, compute readinessScore from userProgressSkills if present
const oldCompetenciesBlock = `    let skillCompetencies = [];
    if (userProgressSkills.length >= 3) {
      skillCompetencies = userProgressSkills.map(s => ({
        name: s.skill_name,
        score: Number(s.total_score) || Number(s.base_percentage) || 35,
        verified: s.status === 'LIVE VERIFIED' || Number(s.total_score) >= 80,
        category: s.category || 'Core Skill',
        current_milestone: s.current_milestone,
        next_milestone: s.next_milestone
      }));
    }`;

const newCompetenciesBlock = `    let skillCompetencies = [];
    if (userProgressSkills.length >= 3) {
      skillCompetencies = userProgressSkills.map(s => ({
        name: s.skill_name,
        score: Number(s.total_score) || Number(s.base_percentage) || 35,
        verified: s.status === 'LIVE VERIFIED' || Number(s.total_score) >= 80,
        category: s.category || 'Core Skill',
        current_milestone: s.current_milestone,
        next_milestone: s.next_milestone
      }));
      // Recalculate readiness score as arithmetic mean of skill progress
      readinessScore = Math.round(skillCompetencies.reduce((sum, s) => sum + s.score, 0) / skillCompetencies.length);
    } else if (activities.length === 0) {
      readinessScore = 35;
    }`;

const normDb2 = dbJs.replace(/\r\n/g, '\n');
const normComp = oldCompetenciesBlock.replace(/\r\n/g, '\n');
if (normDb2.includes(normComp)) {
  dbJs = normDb2.replace(normComp, newCompetenciesBlock).replace(/\n/g, '\r\n');
  console.log('✓ Added dynamic arithmetic mean readinessScore calculation to db.js');
}

// Replace let readinessScore = 75 in db.js
dbJs = dbJs.replace(/let readinessScore = 75;/g, 'let readinessScore = 35;');
dbJs = dbJs.replace(/Number\(candRes\.rows\[0\]\.readiness_score\) \|\| Number\(candRes\.rows\[0\]\.skill_score\) \|\| 75/g, 'Number(candRes.rows[0].readiness_score) || Number(candRes.rows[0].skill_score) || 35');

fs.writeFileSync(dbPath, dbJs, 'utf8');
console.log('✓ Wrote updated api/_handlers/db.js successfully!');

console.log('--- 8. Updating api/_handlers/activity.js fallback defaults ---');
activityJs = activityJs.replace(/\|\| \(scoreVal !== null \? scoreVal : 75\)/g, '|| (scoreVal !== null ? scoreVal : 35)');
fs.writeFileSync(activityPath, activityJs, 'utf8');
console.log('✓ Wrote updated api/_handlers/activity.js successfully!');

console.log('\n>>> All card dynamic score fixes applied successfully! <<<');
