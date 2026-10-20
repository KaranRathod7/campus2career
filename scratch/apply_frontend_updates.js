const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');
const isCrlf = content.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

function replaceSnippet(name, oldSnippet, newSnippet) {
  const normOld = oldSnippet.replace(/\r?\n/g, eol);
  const normNew = newSnippet.replace(/\r?\n/g, eol);

  if (content.includes(normOld)) {
    content = content.replace(normOld, normNew);
    console.log(`[SUCCESS] ${name}`);
    return true;
  } else {
    console.error(`[ERROR] Could not find target for ${name}`);
    return false;
  }
}

// 1. Skill Card Verification Badge and Test Button in renderSkillLevelDiagram
const oldCardBadge = `        const tier = getSkillTier(calculatedTotal);
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
              </div>`;

const newCardBadge = `        const tier = getSkillTier(calculatedTotal);
        const skillFusion = getFusionColor(calculatedTotal);
        const card = document.createElement('div');
        const isCapped = bd.isCapped || (skill.status && skill.status.includes('80% CAP'));
        const isSkillVerified = (!isCapped && (calculatedTotal >= 80 || skill.status === 'LIVE VERIFIED' || Boolean(skill.verified)));

        card.className = "bg-white dark:bg-[#0F172A] p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-4";
        card.innerHTML = \`
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-xs font-bold text-slate-900 dark:text-white">\${skill.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded \${skill.category && skill.category.includes('Leadership') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">\${skill.category || 'Core Skill'}</span>
                \${isCapped ? \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700">
                    <i class="fa-solid fa-lock mr-1"></i> 80% CAP (Score 100% on Benchmark to Unlock Master Level)
                  </span>
                \` : isSkillVerified ? \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                    <i class="fa-solid fa-circle-check mr-1"></i> LIVE VERIFIED (\${calculatedTotal}%)
                  </span>
                \` : \`
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                    <i class="fa-solid fa-clock mr-1"></i> \${skill.status && !skill.status.includes('(') ? \`\${skill.status} (\${calculatedTotal}%)\` : (skill.status || \`UNVERIFIED BASELINE (\${calculatedTotal}%)\`)}
                  </span>
                \`}
              </div>`;

replaceSnippet('Card Badge Status & 80% Cap', oldCardBadge, newCardBadge);

// 2. Skill Card Take Test Button
const oldCardButton = `              <button onclick="navigateTo('mcq')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center cursor-pointer">
                \${isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;'}
              </button>`;

const newCardButton = `              <button onclick="startQuizForSkill('\${skill.id}', '\${encodeURIComponent(skill.name)}')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center cursor-pointer">
                \${isCapped ? 'Unlock Master (100% Req) &rarr;' : (isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;')}
              </button>`;

replaceSnippet('Card Take Test Button to Target Skill', oldCardButton, newCardButton);

// 3. Define startQuizForSkill before switchQuizModule
const oldSwitchModule = `    function switchQuizModule(modKey) {`;

const newStartQuizAndSwitch = `    function startQuizForSkill(skillId, encodedSkillName) {
      let skillName = '';
      try {
        skillName = decodeURIComponent(encodedSkillName || '');
      } catch (e) {
        skillName = unescape(encodedSkillName || '');
      }
      appState.targetSkillId = skillId;
      appState.targetSkillName = skillName;

      // Ensure stream quiz modules are populated
      const streamKey = getActiveStreamKey();
      if ((!appState.quizModules || Object.keys(appState.quizModules).length === 0) && typeof STREAM_DATA !== 'undefined' && STREAM_DATA[streamKey] && STREAM_DATA[streamKey].quizModules) {
        appState.quizModules = JSON.parse(JSON.stringify(STREAM_DATA[streamKey].quizModules));
      }

      // Find best matching module
      let matchedModKey = null;
      const modKeys = Object.keys(appState.quizModules || {});

      // 1. Direct key match
      if (appState.quizModules[skillId]) {
        matchedModKey = skillId;
      }

      // 2. Contains skillId
      if (!matchedModKey && skillId) {
        matchedModKey = modKeys.find(k => k.toLowerCase().includes(skillId.toLowerCase()) || skillId.toLowerCase().includes(k.toLowerCase()));
      }

      // 3. Keyword heuristic on skillName / skillId
      if (!matchedModKey && (skillId || skillName)) {
        const sId = (skillId || '').toLowerCase();
        const sNm = (skillName || '').toLowerCase();
        if (sId.includes('docker') || sNm.includes('docker') || sNm.includes('container')) {
          matchedModKey = modKeys.find(k => k.includes('docker')) || 'it_docker' || 'docker';
        } else if (sId.includes('debug') || sNm.includes('debug') || sNm.includes('profiling')) {
          matchedModKey = modKeys.find(k => k.includes('debug')) || 'it_debug' || 'debug';
        } else if (sId.includes('postgres') || sId.includes('db') || sNm.includes('sql') || sNm.includes('database')) {
          matchedModKey = modKeys.find(k => k.includes('db')) || 'it_db' || 'db';
        } else if (sId.includes('spring') || sId.includes('java') || sNm.includes('java') || sNm.includes('spring')) {
          matchedModKey = modKeys.find(k => k.includes('java')) || 'it_java' || 'java';
        } else if (sNm.includes('rtos') || sId.includes('rtos')) {
          matchedModKey = modKeys.find(k => k.includes('rtos')) || 'ece_rtos';
        } else if (sNm.includes('firmware') || sNm.includes('arm') || sId.includes('firmware')) {
          matchedModKey = modKeys.find(k => k.includes('firmware')) || 'ece_firmware';
        } else if (sNm.includes('rag') || sNm.includes('genai') || sNm.includes('vector')) {
          matchedModKey = modKeys.find(k => k.includes('rag')) || 'aids_rag';
        } else if (sNm.includes('distributed') || sId.includes('distributed')) {
          matchedModKey = modKeys.find(k => k.includes('distributed')) || 'cse_distributed';
        }
      }

      // 4. Module title match
      if (!matchedModKey && skillName) {
        const sWords = skillName.toLowerCase().split(/[\\s,&-]+/).filter(w => w.length > 2);
        matchedModKey = modKeys.find(k => {
          const title = ((appState.quizModules[k] && appState.quizModules[k].title) || '').toLowerCase();
          return sWords.some(w => title.includes(w));
        });
      }

      if (matchedModKey && appState.quizModules[matchedModKey]) {
        switchQuizModule(matchedModKey);
      } else if (modKeys.length > 0) {
        switchQuizModule(modKeys[0]);
      }

      navigateTo('mcq');
      showToast(\`Starting 10-MCQ Benchmark Exam: \${skillName}\`);
    }

    function switchQuizModule(modKey) {`;

replaceSnippet('startQuizForSkill Function Definition', oldSwitchModule, newStartQuizAndSwitch);

// 4. Update submitQuiz in index.html
const oldSubmitQuizPart = `      // Real-World Analysis Engine: Update matching skill using composite formula
      const mod = appState.quizModules[appState.activeQuizModule] || { title: 'Engineering Systems' };
      const matchingSkill = (appState.currentStack || []).find(s => 
        mod.title.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()) ||
        s.name.toLowerCase().includes(mod.title.split(' ')[0].toLowerCase())
      ) || appState.currentStack[0];

      const durationMinutes = (appState.testMode === 20) ? 20 : 10;

      // Dispatch benchmark exam to student activity pipeline
      logStudentActivityToServer('exam', durationMinutes, percentage, mod.title);

      const now = new Date();
      const dateStr = \`\${now.getFullYear()}-\${(now.getMonth()+1).toString().padStart(2, '0')}-\${now.getDate().toString().padStart(2, '0')}\`;
      
      appState.mcqHistory.push({
        id: Date.now(),
        date: dateStr,
        module: mod.title,
        mode: appState.testMode || 10,
        score: percentage,
        passed
      });

      // Record test attempt via /api/tests/submit & cryptographic credential
      try {
        const testPayload = {
          userId: appState.user ? (appState.user.id || appState.user.email) : null,
          user_id: appState.user ? (appState.user.id || appState.user.email) : null,
          skillName: matchingSkill ? matchingSkill.name : mod.title,
          skill_name: matchingSkill ? matchingSkill.name : mod.title,
          testTitle: mod.title,
          test_title: mod.title,
          score: percentage,
          totalQuestions: qList.length,
          total_questions: qList.length,
          correctAnswers: correctCount,
          correct_answers: correctCount,
          breakdown: {
            mode: appState.testMode || 10,
            answers: appState.quizAnswers,
            stream: (appState.user && appState.user.branch) || appState.selectedStream || 'it'
          }
        };

        fetch('/api/tests/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(testPayload)
        }).then(r => r.json()).then(resData => {
          if (resData && resData.summary && matchingSkill) {
            if (resData.summary.total_score !== undefined) {
              matchingSkill.score = Number(resData.summary.total_score);
            }
            if (resData.summary.status) {
              matchingSkill.status = resData.summary.status;
            }
            renderSkillLevelDiagram();
            runLiveRecalculations();
          }
        }).catch(() => {});`;

const newSubmitQuizPart = `      // Real-World Analysis Engine: Strictly prioritize the targeted skill that user initiated
      let matchingSkill = null;
      if (appState.targetSkillName) {
        matchingSkill = (appState.currentStack || []).find(s => 
          s.name.toLowerCase() === appState.targetSkillName.toLowerCase() ||
          (appState.targetSkillId && s.id === appState.targetSkillId)
        );
      }
      if (!matchingSkill) {
        const modFallback = appState.quizModules[appState.activeQuizModule] || { title: 'Engineering Systems' };
        matchingSkill = (appState.currentStack || []).find(s => 
          modFallback.title.toLowerCase().includes(s.name.split(' ')[0].toLowerCase()) ||
          s.name.toLowerCase().includes(modFallback.title.split(' ')[0].toLowerCase())
        ) || appState.currentStack[0];
      }

      const mod = (appState.quizModules && appState.quizModules[appState.activeQuizModule]) || { title: (matchingSkill ? matchingSkill.name : 'Engineering Systems') };
      const targetSkillName = matchingSkill ? matchingSkill.name : (appState.targetSkillName || mod.title);

      const durationMinutes = (appState.testMode === 20) ? 20 : 10;

      // Dispatch benchmark exam to student activity pipeline
      logStudentActivityToServer('exam', durationMinutes, percentage, mod.title);

      const now = new Date();
      const dateStr = \`\${now.getFullYear()}-\${(now.getMonth()+1).toString().padStart(2, '0')}-\${now.getDate().toString().padStart(2, '0')}\`;
      
      appState.mcqHistory.push({
        id: Date.now(),
        date: dateStr,
        skill_name: targetSkillName,
        module: mod.title,
        mode: appState.testMode || 10,
        score: percentage,
        passed
      });

      // Record test attempt via /api/tests/submit & cryptographic credential
      try {
        const testPayload = {
          userId: appState.user ? (appState.user.id || appState.user.email) : null,
          user_id: appState.user ? (appState.user.id || appState.user.email) : null,
          skillName: targetSkillName,
          skill_name: targetSkillName,
          testTitle: mod.title,
          test_title: mod.title,
          score: percentage,
          totalQuestions: qList.length,
          total_questions: qList.length,
          correctAnswers: correctCount,
          correct_answers: correctCount,
          breakdown: {
            mode: appState.testMode || 10,
            answers: appState.quizAnswers,
            stream: (appState.user && appState.user.branch) || appState.selectedStream || 'it'
          }
        };

        fetch('/api/tests/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(testPayload)
        }).then(r => r.json()).then(resData => {
          if (resData && resData.summary && matchingSkill) {
            if (resData.summary.total_score !== undefined) {
              matchingSkill.score = Number(resData.summary.total_score);
              matchingSkill.total_score = Number(resData.summary.total_score);
            }
            if (resData.summary.diagnostic_score !== undefined) {
              matchingSkill.diagnostic_score = Number(resData.summary.diagnostic_score);
            }
            if (resData.summary.latest_exam_score !== undefined) {
              matchingSkill.latest_exam_score = Number(resData.summary.latest_exam_score);
            }
            if (resData.summary.status) {
              matchingSkill.status = resData.summary.status;
            }
            if (resData.summary.verified !== undefined) {
              matchingSkill.verified = Boolean(resData.summary.verified);
            }
            saveStateToStorage();
            renderSkillLevelDiagram();
            runLiveRecalculations();
          }
        }).catch(() => {});`;

replaceSnippet('submitQuiz Targeted Skill Submission & Response Handling', oldSubmitQuizPart, newSubmitQuizPart);

// 5. Update calculateSkillBreakdown for incremental test progression and 80% mastery gate
const oldBreakdownPart = `      // 4. Diagnostic & Benchmark Tests / MCQs (Remaining 34% Weight): Earned purely through verified tests. Fresh account = +0%.
      const skillTests = (appState.mcqHistory || []).filter(h => 
        (h.module && skill.name && (
          h.module.toLowerCase().includes(skill.name.split(' ')[0].toLowerCase()) ||
          skill.name.toLowerCase().includes(h.module.split(' ')[0].toLowerCase())
        ))
      );

      let testBonus = 0;
      if (skillTests.length > 0) {
        const latest = skillTests[skillTests.length - 1];
        const scoreVal = Number(latest.score) || 0;
        if (scoreVal >= 80) {
          testBonus = Math.min(34, Math.round(((scoreVal - 50) / 50) * 34));
        } else if (scoreVal >= 50) {
          testBonus = Math.min(34, Math.round(((scoreVal - 50) / 50) * 20));
        } else {
          testBonus = 0;
        }
      } else if (skill.verified || skill.status === 'LIVE VERIFIED') {
        const extra = (Number(skill.total_score) || Number(skill.score) || baseScore) - baseScore - videoCredit - marathonBonus;
        testBonus = Math.min(34, Math.max(0, extra));
      }

      // Total Score = Base (max 48%) + Lectures (max 15%) + Marathon (max 3%) + Tests (max 34%)
      const total = Math.min(100, Math.max(20, baseScore + videoCredit + marathonBonus + testBonus));

      return { baseScore, videoCredit, marathonBonus, testBonus, total, completedLessonsCount, hasMarathon };`;

const newBreakdownPart = `      // 4. Diagnostic & Benchmark Tests / MCQs (Remaining 34% Weight): Earned purely through verified tests. Fresh account = +0%.
      // Incremental progression: Each 10-MCQ benchmark yields an incremental gain based on score
      // 100% awards up to +5%, proportional scores award partial progress (e.g. 80% = +4%), accumulating toward 34% ceiling
      const skillTests = (appState.mcqHistory || []).filter(h => 
        (h.skill_name && skill.name && h.skill_name.toLowerCase() === skill.name.toLowerCase()) ||
        (h.module && skill.name && (
          h.module.toLowerCase() === skill.name.toLowerCase() ||
          h.module.toLowerCase().includes(skill.name.split(' ')[0].toLowerCase()) ||
          skill.name.toLowerCase().includes(h.module.split(' ')[0].toLowerCase())
        ))
      );

      let accumulatedGains = 0;
      let latestExamScore = 0;

      if (skillTests.length > 0) {
        latestExamScore = Number(skillTests[skillTests.length - 1].score) || 0;
        skillTests.forEach(attempt => {
          const s = Math.max(0, Math.min(100, Number(attempt.score) || 0));
          const inc = Math.round((s / 100) * 5); // 100% = +5%, 80% = +4%, 60% = +3%
          accumulatedGains += inc;
        });
      } else if (skill.latest_exam_score !== undefined && skill.latest_exam_score !== null) {
        latestExamScore = Number(skill.latest_exam_score) || 0;
      }

      let testBonus = Math.min(34, accumulatedGains);
      if (skill.diagnostic_score !== undefined && skill.diagnostic_score !== null) {
        testBonus = Math.min(34, Math.max(testBonus, Number(skill.diagnostic_score)));
      } else if (skill.verified || skill.status === 'LIVE VERIFIED') {
        const extra = (Number(skill.total_score) || Number(skill.score) || baseScore) - baseScore - videoCredit - marathonBonus;
        testBonus = Math.min(34, Math.max(testBonus, extra));
      }

      // Total Score = Base (max 48%) + Lectures (max 15%) + Marathon (max 3%) + Tests (max 34%)
      const rawTotal = baseScore + videoCredit + marathonBonus + testBonus;
      let total = rawTotal;
      let isCapped = false;

      // 80% Total Mastery Gate: Total score cannot exceed 80% unless latest benchmark score was 100%
      if (rawTotal > 80 && latestExamScore < 100) {
        total = 80;
        isCapped = true;
      } else {
        total = Math.min(100, Math.max(20, rawTotal));
        isCapped = false;
      }

      return {
        baseScore,
        videoCredit,
        marathonBonus,
        testBonus,
        rawTotal,
        total,
        isCapped,
        latestExamScore,
        completedLessonsCount,
        hasMarathon
      };`;

replaceSnippet('calculateSkillBreakdown Incremental Gains & 80% Mastery Gate', oldBreakdownPart, newBreakdownPart);

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('All frontend updates applied to index.html successfully!');
