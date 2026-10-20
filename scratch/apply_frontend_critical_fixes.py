import re

def apply_frontend_fixes():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Exact Viewport Meta Tag
    # <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    content = re.sub(
        r'<meta\s+name=["\']viewport["\'][^>]*>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
        content,
        count=1,
        flags=re.IGNORECASE
    )
    print("[OK] Viewport meta tag verified & replaced with user-scalable=no")

    # 2. Global Container Fluidity & Navigation Bar Mobile Collapse in <style>
    target_style_start = """    /* Prevent horizontal overflow on mobile viewports & Root Box Model */
    html {
      box-sizing: border-box;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden !important;
      -webkit-text-size-adjust: 100%;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after {
      box-sizing: inherit;
    }
    body {
      overflow-x: hidden !important;
      width: 100%;
      max-width: 100vw;
      margin: 0;
      padding: 0;
    }"""

    replacement_style_start = """    /* Global Container Fluidity & Viewport Overflow Lock */
    html, body {
      overflow-x: hidden !important;
      width: 100% !important;
      max-width: 100vw !important;
      position: relative;
      margin: 0;
      padding: 0;
      box-sizing: border-box !important;
      -webkit-text-size-adjust: 100%;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }

    /* Force fluid layout across all responsive breakpoints & eliminate fixed desktop widths */
    @media (max-width: 768px) {
      .max-w-7xl, .max-w-6xl, .max-w-5xl, .max-w-4xl, .max-w-3xl, .max-w-2xl, .max-w-xl, .max-w-lg, .max-w-md,
      .screen-view, main, section, .dashboard-container, .hero-section, header > div, footer > div, .card-container, #root, #app {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Navigation Bar Mobile Collapse: display only brand logo & simple hamburger */
      #navLearnerItems,
      #navRecruiterItems,
      #authenticatedNavTabs,
      #navStreamSelectorContainer,
      #headerRecruiterAccessBtn,
      #notifDropdown,
      .notification-bell-wrapper,
      button[title="Notifications"],
      #themeToggleBtn,
      #authActionsLoggedOut,
      #authActionsLoggedIn {
        display: none !important;
      }

      /* When mobile drawer toggle is tapped, render links in vertical stack (flex-direction: column) */
      #mobileNavDrawer nav,
      #mobileNavDrawer .space-y-1,
      #mobileLearnerLinks,
      #mobileRecruiterLinks {
        display: flex !important;
        flex-direction: column !important;
      }
    }"""
    if target_style_start in content:
        content = content.replace(target_style_start, replacement_style_start, 1)
        print("[OK] Global container fluidity & mobile navbar collapse rules injected")
    else:
        print("! target_style_start not matched directly, checking normalized")

    # 3. Add Overflow Debugging Snippet right before </body>
    debug_snippet = """  <!-- Temporary Overflow Debugging Snippet (Logs any elements wider than viewport) -->
  <script>
    window.addEventListener('load', () => {
      document.querySelectorAll('*').forEach(el => {
        if (el.offsetWidth > document.documentElement.offsetWidth) {
          console.warn('OVERFLOWING ELEMENT:', el);
        }
      });
    });
  </script>
</body>"""
    if "<!-- Temporary Overflow Debugging Snippet" not in content:
        content = content.replace("</body>", debug_snippet, 1)
        print("[OK] Temporary overflow debugging snippet added before </body>")

    # 4. Update formula breakdown subtext in renderSkillLevelDiagram
    old_breakdown_pill = """          <!-- TRANSPARENT COMPOSITE EVALUATION FORMULA BREAKDOWN PILL -->
          <div class="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div class="flex items-center space-x-2 flex-wrap text-slate-600 dark:text-slate-300">
              <span>Base: <strong class="text-slate-900 dark:text-white">${bd.baseScore}%</strong></span>
              <span>&bull;</span>
              <span class="${bd.videoCredit > 0 ? 'text-teal-600 dark:text-teal-400 font-bold' : ''}">Lectures: <strong>+${bd.videoCredit}%/20%</strong> (${bd.completedLessonsCount}/15)</span>
              <span>&bull;</span>
              <span class="${bd.marathonBonus > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}">Marathon: <strong>+${bd.marathonBonus}%/3%</strong></span>
              <span>&bull;</span>
              <span class="${bd.testBonus > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : bd.testBonus < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}">Diagnostic: <strong>${bd.testBonus >= 0 ? '+' : ''}${bd.testBonus}%</strong></span>
            </div>
            <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">${skill.score}%</span>
            </div>
          </div>"""

    new_breakdown_pill = """          <!-- TRANSPARENT COMPOSITE EVALUATION FORMULA BREAKDOWN PILL -->
          <div class="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div class="flex items-center space-x-2 flex-wrap text-slate-600 dark:text-slate-300">
              <span>Base: <strong class="text-slate-900 dark:text-white">${bd.baseScore}%</strong></span>
              <span>&bull;</span>
              <span class="${bd.videoCredit > 0 ? 'text-teal-600 dark:text-teal-400 font-bold' : ''}">Lectures: <strong>+${bd.videoCredit}%/15%</strong> (${bd.completedLessonsCount}/15)</span>
              <span>&bull;</span>
              <span class="${bd.marathonBonus > 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}">Marathon: <strong>+${bd.marathonBonus}%/3%</strong></span>
              <span>&bull;</span>
              <span class="${bd.testBonus > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}">Diagnostic: <strong>+${bd.testBonus}%/34%</strong></span>
            </div>
            <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">${skill.score}%</span>
            </div>
          </div>"""
    if old_breakdown_pill in content:
        content = content.replace(old_breakdown_pill, new_breakdown_pill, 1)
        print("[OK] Formula breakdown pill updated to 15% Lectures and 34% Diagnostic")
    else:
        print("! old_breakdown_pill not matched")

    # 5. Update Target Stack Readiness Score to average computed active skill scores
    old_readiness = """        const rawAvg = Math.round(appState.currentStack.reduce((acc, s) => acc + s.score, 0) / appState.currentStack.length);
        const displayScore = hasVerifiedTests ? rawAvg : Math.min(rawAvg, 48);
        const finalScore = (appState.user && appState.user.dynamic_competence_percent !== undefined)
          ? Math.round(Number(appState.user.dynamic_competence_percent))
          : displayScore;"""

    new_readiness = """        const rawAvg = Math.round(appState.currentStack.reduce((acc, s) => acc + (s.score || 35), 0) / appState.currentStack.length);
        const finalScore = rawAvg;"""
    if old_readiness in content:
        content = content.replace(old_readiness, new_readiness, 1)
        print("[OK] Target Stack Readiness Score updated to average active computed skill scores")
    else:
        print("! old_readiness not matched")

    # 6. Recalibrate calculateSkillBreakdown
    old_calc_breakdown = """    function calculateSkillBreakdown(skill) {
      if (!skill) return { baseScore: 20, videoCredit: 0, marathonBonus: 0, testBonus: 0, total: 20, completedLessonsCount: 0, hasMarathon: false };

      const baseScore = skill.baseScore || (appState.user && appState.user.initialLevel === 'beginner' ? 20 : (appState.user && appState.user.initialLevel === 'intermediate' ? 35 : 48));
      
      const skillId = skill.id;
      const completedList = (appState.progress && appState.progress.completedLessonsBySkill && appState.progress.completedLessonsBySkill[skillId]) || [];
      const completedLessonsCount = completedList.length;
      // 15 lessons total = 20% max video credit
      const videoCredit = Math.min(20, Math.round((completedLessonsCount / 15) * 20));

      const streamKey = getActiveStreamKey();
      const hasMarathon = Boolean(appState.progress && appState.progress.completedMarathons && appState.progress.completedMarathons[streamKey]);
      const marathonBonus = hasMarathon ? 3 : 0;

      const skillTests = (appState.mcqHistory || []).filter(h => 
        h.module.toLowerCase().includes(skill.name.split(' ')[0].toLowerCase()) ||
        skill.name.toLowerCase().includes(h.module.split(' ')[0].toLowerCase())
      );

      let testBonus = 0;
      if (skillTests.length > 0) {
        const latest = skillTests[skillTests.length - 1];
        if (latest.score >= 80) {
          testBonus = Math.round((latest.score - 70) * 0.65); // up to +20%
        } else if (latest.score < 50) {
          testBonus = -Math.round((50 - latest.score) * 0.35); // negative adjustment for poor score
        } else {
          testBonus = 4;
        }
      }

      const total = Math.min(100, Math.max(20, baseScore + videoCredit + marathonBonus + testBonus));
      return { baseScore, videoCredit, marathonBonus, testBonus, total, completedLessonsCount, hasMarathon };
    }"""

    new_calc_breakdown = """    function calculateSkillBreakdown(skill) {
      if (!skill) return { baseScore: 20, videoCredit: 0, marathonBonus: 0, testBonus: 0, total: 20, completedLessonsCount: 0, hasMarathon: false };

      // 1. Unverified Starting Baseline: Strictly capped at 48% max (20% Beginner, 35% Intermediate, 48% Advanced)
      let baseScore = skill.baseScore !== undefined ? skill.baseScore : skill.base_percentage;
      if (baseScore === undefined || baseScore === null) {
        if (appState.user && appState.user.initialLevel === 'beginner') baseScore = 20;
        else if (appState.user && appState.user.initialLevel === 'intermediate') baseScore = 35;
        else if (appState.user && appState.user.initialLevel === 'advanced') baseScore = 48;
        else if (skill.score && skill.score <= 25) baseScore = 20;
        else if (skill.score && skill.score <= 40) baseScore = 35;
        else if (skill.score && skill.score <= 50) baseScore = 48;
        else baseScore = 35;
      }
      baseScore = Math.min(48, Math.max(20, Number(baseScore) || 35));

      // 2. Video Lectures (15% Weight): 15 unique completed lectures max = +15%. Fresh account = +0% (0/15).
      const skillId = skill.id || (skill.name ? skill.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'skill');
      const completedList = (appState.progress && appState.progress.completedLessonsBySkill && (appState.progress.completedLessonsBySkill[skillId] || appState.progress.completedLessonsBySkill[skill.name])) || [];
      const dbLecturesCount = Number(skill.lectures_completed) || 0;
      const completedLessonsCount = Math.min(15, Math.max(completedList.length, dbLecturesCount));
      const videoCredit = Math.min(15, completedLessonsCount); // Linear 1% per unique completed lecture, max 15%

      // 3. Marathons / Labs (3% Weight): Dedicated hands-on practice sessions / timed marathons. Fresh account = +0%, max +3%.
      const streamKey = getActiveStreamKey();
      const hasMarathon = Boolean(appState.progress && appState.progress.completedMarathons && appState.progress.completedMarathons[streamKey]);
      const marathonBonus = hasMarathon ? 3 : 0;

      // 4. Diagnostic & Benchmark Tests / MCQs (Remaining 34% Weight): Earned purely through verified tests. Fresh account = +0%.
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

      return { baseScore, videoCredit, marathonBonus, testBonus, total, completedLessonsCount, hasMarathon };
    }"""
    if old_calc_breakdown in content:
        content = content.replace(old_calc_breakdown, new_calc_breakdown, 1)
        print("[OK] calculateSkillBreakdown recalibrated to strict 4-component formula")
    else:
        print("! old_calc_breakdown not matched")

    # 7. Add Watch Time Tracking Variables & Beacon in switchPlaylistLesson
    old_switch_lesson = """      const progressEl = document.getElementById('resPlaylistProgress');
      const isSim = (activeModalTier === 'simulations');
      if (progressEl) progressEl.innerText = `${isSim ? 'Simulation' : 'Lesson'} ${idx + 1} of ${activePlaylist.length}`;"""

    new_switch_lesson = """      const progressEl = document.getElementById('resPlaylistProgress');
      const isSim = (activeModalTier === 'simulations');
      if (progressEl) progressEl.innerText = `${isSim ? 'Simulation' : 'Lesson'} ${idx + 1} of ${activePlaylist.length}`;

      // Lecture Watch-Time Verification & Anti-Fraud Setup (85% threshold)
      let durationSecs = 1500; // default 25m
      if (lesson.duration) {
        const dStr = String(lesson.duration).trim().toLowerCase();
        let total = 0;
        const hrM = dStr.match(/(\d+)\s*h/);
        const minM = dStr.match(/(\d+)\s*m/);
        const secM = dStr.match(/(\d+)\s*s/);
        if (hrM) total += parseInt(hrM[1], 10) * 3600;
        if (minM) total += parseInt(minM[1], 10) * 60;
        if (secM) total += parseInt(secM[1], 10);
        if (total > 0) durationSecs = total;
      }
      activeLessonDurationSeconds = durationSecs;
      activeLessonWatchedSeconds = 0;
      activeLessonCompletedSent = false;"""

    if old_switch_lesson in content:
        content = content.replace(old_switch_lesson, new_switch_lesson, 1)
        print("[OK] switchPlaylistLesson updated with duration detection & anti-fraud reset")
    else:
        print("! old_switch_lesson not matched")

    # 8. Add triggerLectureCompletionBeacon function & global variables before switchPlaylistLesson
    target_pos_beacon = "    let activeLessonIdx = 0;"
    beacon_code = """    let activeLessonIdx = 0;
    let activeLessonDurationSeconds = 1500;
    let activeLessonWatchedSeconds = 0;
    let activeLessonCompletedSent = false;

    async function triggerLectureCompletionBeacon(skillId, lesson, durationSecs, watchedSecs) {
      if (!lesson) return;
      try {
        const curric = getSkillCurriculum(skillId);
        const skillName = curric ? curric.name : (skillId || 'Core Skill');
        const lectureId = lesson.vid || `lesson-${lesson.part}`;

        const res = await fetch('/api/student/lecture-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            skill_name: skillName,
            lecture_id: lectureId,
            duration_seconds: durationSecs,
            time_watched_seconds: watchedSecs
          })
        });

        const data = await res.json();
        if (data && data.success && data.completed) {
          if (!appState.progress) appState.progress = {};
          if (!appState.progress.completedLessonsBySkill) appState.progress.completedLessonsBySkill = {};
          if (!appState.progress.completedLessonsBySkill[skillId]) appState.progress.completedLessonsBySkill[skillId] = [];
          if (!appState.progress.completedLessonsBySkill[skillId].includes(lectureId)) {
            appState.progress.completedLessonsBySkill[skillId].push(lectureId);
          }

          if (appState.currentStack) {
            const match = appState.currentStack.find(s => 
              (s.id && s.id === skillId) || 
              (s.name && s.name.toLowerCase() === skillName.toLowerCase())
            );
            if (match) {
              match.lectures_completed = data.lectures_completed;
              const bd = calculateSkillBreakdown(match);
              match.score = bd.total;
            }
          }

          saveStateToStorage();
          renderSkillLevelDiagram();
          runLiveRecalculations();
          showToast(`✓ Lecture Legitimately Verified: "${lesson.title}" completed (+1 unique lecture towards 15% weight)!`);
        }
      } catch (err) {
        console.warn('[Lecture Progress Sync Notice]', err);
      }
    }"""
    if target_pos_beacon in content:
        content = content.replace(target_pos_beacon, beacon_code, 1)
        print("[OK] triggerLectureCompletionBeacon and watch-time trackers added")
    else:
        print("! target_pos_beacon not matched")

    # 9. Update stopwatch timer interval to track active watch time and trigger beacon
    old_timer = """      if (appState.studyStopwatchInterval) clearInterval(appState.studyStopwatchInterval);
      appState.studyStopwatchInterval = setInterval(() => {
        appState.studyStopwatchSecs++;
        updateStopwatchDisplay();
      }, 1000);"""

    new_timer = """      if (appState.studyStopwatchInterval) clearInterval(appState.studyStopwatchInterval);
      appState.studyStopwatchInterval = setInterval(() => {
        appState.studyStopwatchSecs++;
        updateStopwatchDisplay();

        // Increment active watch time only when page is focused/visible (anti-fraud check)
        if (document.visibilityState === 'visible' && !document.hidden) {
          activeLessonWatchedSeconds++;
          const requiredSeconds = Math.floor(activeLessonDurationSeconds * 0.85);

          // Once active watch time meets or exceeds 85% of content duration, verify completion
          if (activeLessonWatchedSeconds >= requiredSeconds && !activeLessonCompletedSent) {
            activeLessonCompletedSent = true;
            triggerLectureCompletionBeacon(activeModalSkillId, activePlaylist[activeLessonIdx], activeLessonDurationSeconds, activeLessonWatchedSeconds);
          }
        }
      }, 1000);"""
    if old_timer in content:
        content = content.replace(old_timer, new_timer, 1)
        print("[OK] Stopwatch interval updated with active watch-time verification beacon")
    else:
        print("! old_timer not matched")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done applying frontend critical fixes to index.html!")

if __name__ == '__main__':
    apply_frontend_fixes()
