import sys

def apply_fixes():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add 1-Click Interactive Demo button to Home Hero CTA next to "View My Skill Level Diagram ->"
    hero_search = """        <!-- Call to Actions -->
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onclick="startSkillEvaluationWithoutSignup()" class="w-full sm:w-auto px-6 py-3.5 bg-[#008080] hover:bg-[#006666] text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center space-x-2">
            <i class="fa-solid fa-chart-line mr-1"></i>
            <span>View My Skill Level Diagram &rarr;</span>
          </button>
          <button onclick="navigateTo('resources')\""""

    hero_replace = """        <!-- Call to Actions -->
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onclick="startSkillEvaluationWithoutSignup()" class="w-full sm:w-auto px-6 py-3.5 bg-[#008080] hover:bg-[#006666] text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center space-x-2">
            <i class="fa-solid fa-chart-line mr-1"></i>
            <span>View My Skill Level Diagram &rarr;</span>
          </button>
          <button type="button" onclick="quickFacultyLogin()" class="w-full sm:w-auto px-6 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-400/50 dark:border-amber-500/40 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer">
            <i class="fa-solid fa-graduation-cap text-amber-500 text-sm"></i>
            <span>1-Click Interactive Demo &rarr;</span>
          </button>
          <button onclick="navigateTo('resources')\""""

    if hero_search in content:
        content = content.replace(hero_search, hero_replace, 1)
        print("Fix 1 (Hero Demo CTA Button) applied.")
    else:
        print("WARNING: hero_search not found!")

    # 2. Add missing functions: updateNavStreamLabel and updateGrowthSummaryCards, and convert let activeResource to var
    missing_funcs_anchor = """    function setSkillScoreDirect(idx, score) {
      showToast("Baseline level is locked. Take the 10-MCQ benchmark exam to upgrade verified competence.");
    }"""

    missing_funcs_code = """    function setSkillScoreDirect(idx, score) {
      showToast("Baseline level is locked. Take the 10-MCQ benchmark exam to upgrade verified competence.");
    }

    var activeResourceFilterStream = 'active';
    var activeResourceLang = 'all';

    function updateNavStreamLabel(streamKey) {
      try {
        const labelEl = document.getElementById('navStreamLabelDisplay');
        if (labelEl && typeof STREAM_DATA !== 'undefined' && STREAM_DATA[streamKey]) {
          labelEl.innerText = STREAM_DATA[streamKey].shortName || streamKey.toUpperCase();
        }
      } catch (err) {
        console.warn('updateNavStreamLabel caught error:', err);
      }
    }

    function updateGrowthSummaryCards() {
      try {
        const totalMins = (appState.progress && appState.progress.totalStudyMinutes) 
          || (appState.user && appState.user.totalStudyMinutes) 
          || 0;
        const hours = (totalMins / 60).toFixed(1);
        const sessions = (appState.progress && appState.progress.learningSessions) || [];
        const streak = (appState.progress && appState.progress.streakDays) 
          || (appState.user && appState.user.streakDays) 
          || 0;
        const tests = (appState.mcqHistory || (appState.user && appState.user.mcqHistory) || []);

        const hEl = document.getElementById('growthTotalHours');
        const sEl = document.getElementById('growthStudySessionsCount');
        const strEl = document.getElementById('growthStreakDays');
        const tEl = document.getElementById('growthTestsCount');
        const avgEl = document.getElementById('growthAvgScore');

        if (hEl) hEl.innerText = `${hours} hrs`;
        if (sEl) sEl.innerText = `↑ ${sessions.length} sessions logged`;
        if (strEl) strEl.innerText = `${streak} Days`;
        if (tEl) tEl.innerText = `${tests.length} Tests`;

        if (avgEl) {
          if (tests.length > 0) {
            const sum = tests.reduce((acc, t) => acc + (t.score || 0), 0);
            const avg = Math.round(sum / tests.length);
            avgEl.innerText = `Avg: ${avg}%`;
          } else {
            avgEl.innerText = 'Avg: 0%';
          }
        }
      } catch (err) {
        console.warn('updateGrowthSummaryCards caught error:', err);
      }
    }"""

    if missing_funcs_anchor in content:
        content = content.replace(missing_funcs_anchor, missing_funcs_code, 1)
        print("Fix 2 (Declared updateNavStreamLabel and updateGrowthSummaryCards) applied.")
    else:
        print("WARNING: missing_funcs_anchor not found!")

    # 3. Update renderWizardPresets to have proper dark mode styling and crisp readable text
    wizard_presets_anchor = """    function renderWizardPresets(branchKey) {
      const container = document.getElementById('wizardPresetsContainer');
      if (!container || !STREAM_DATA[branchKey]) return;
      container.innerHTML = '';

      const activeRole = appState.selectedRole || (appState.user && appState.user.role) || 'student';
      const isSenior = (activeRole === 'senior' || activeRole === 'architect');

      // Combine stream presets with Senior Track presets if senior role is active
      const presetsToRender = {};
      if (isSenior) {
        Object.assign(presetsToRender, SENIOR_ROLE_PRESETS);
      }
      Object.assign(presetsToRender, STREAM_DATA[branchKey].presets);

      const activePreset = (appState.user && appState.user.activeTrackPreset) || appState.selectedPreset || (isSenior ? 'mgmt_lead' : STREAM_DATA[branchKey].defaultPreset);

      Object.keys(presetsToRender).forEach(key => {
        const p = presetsToRender[key];
        const isSelected = activePreset === key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `wizardPresetBtn-${key}`;
        btn.className = `p-3 border rounded-xl text-left transition-all ${
          isSelected
            ? 'border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500 shadow-2xs'
            : 'border-slate-200 hover:border-teal-300 text-slate-800 bg-white'
        }`;

        let roleBadgeHtml = '';
        if (SENIOR_ROLE_PRESETS[key]) {
          roleBadgeHtml = '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 mb-1"><i class="fa-solid fa-crown mr-1"></i>Senior Leadership &amp; Management</span>';
        }

        btn.innerHTML = `
          ${roleBadgeHtml}
          <span class="block font-bold text-xs sm:text-sm">${p.name}</span>
          <span class="text-[10px] text-slate-500 font-normal mt-0.5 block leading-relaxed">${p.description}</span>
        `;
        btn.onclick = () => selectWizardPreset(key);
        container.appendChild(btn);
      });
    }"""

    wizard_presets_replacement = """    function renderWizardPresets(branchKey) {
      const container = document.getElementById('wizardPresetsContainer');
      if (!container) return;
      if (!STREAM_DATA[branchKey]) {
        branchKey = appState.selectedStream || 'ece';
      }
      if (!STREAM_DATA[branchKey]) return;
      container.innerHTML = '';

      const activeRole = appState.selectedRole || (appState.user && appState.user.role) || 'student';
      const isSenior = (activeRole === 'senior' || activeRole === 'architect');

      // Combine stream presets with Senior Track presets if senior role is active
      const presetsToRender = {};
      if (isSenior) {
        Object.assign(presetsToRender, SENIOR_ROLE_PRESETS);
      }
      if (STREAM_DATA[branchKey] && STREAM_DATA[branchKey].presets) {
        Object.assign(presetsToRender, STREAM_DATA[branchKey].presets);
      }

      const activePreset = (appState.user && appState.user.activeTrackPreset) 
        || appState.selectedPreset 
        || (isSenior ? 'mgmt_lead' : (STREAM_DATA[branchKey] && STREAM_DATA[branchKey].defaultPreset) || Object.keys(presetsToRender)[0]);

      Object.keys(presetsToRender).forEach(key => {
        const p = presetsToRender[key];
        const isSelected = activePreset === key;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `wizardPresetBtn-${key}`;
        btn.className = `p-3 border rounded-xl text-left transition-all cursor-pointer ${
          isSelected
            ? 'border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500 shadow-2xs'
            : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/80'
        }`;

        let roleBadgeHtml = '';
        if (SENIOR_ROLE_PRESETS[key]) {
          roleBadgeHtml = '<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700 mb-1"><i class="fa-solid fa-crown mr-1"></i>Senior Leadership &amp; Management</span>';
        }

        btn.innerHTML = `
          ${roleBadgeHtml}
          <span class="block font-bold text-xs sm:text-sm text-slate-900 dark:text-white">${p.name}</span>
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 block leading-relaxed">${p.description}</span>
        `;
        btn.onclick = () => selectWizardPreset(key);
        container.appendChild(btn);
      });
    }"""

    if wizard_presets_anchor in content:
        content = content.replace(wizard_presets_anchor, wizard_presets_replacement, 1)
        print("Fix 3 (renderWizardPresets with dark mode and safe fallback) applied.")
    else:
        print("WARNING: wizard_presets_anchor not found!")

    # 4. Update selectWizardPreset to default to Intermediate (35%)
    select_preset_anchor = """    function selectWizardPreset(presetKey) {
      const branchKey = appState.selectedStream || (appState.user && appState.user.branch) || 'it';
      const stream = STREAM_DATA[branchKey];
      let preset = null;

      if (SENIOR_ROLE_PRESETS[presetKey]) {
        preset = SENIOR_ROLE_PRESETS[presetKey];
      } else if (stream && stream.presets[presetKey]) {
        preset = stream.presets[presetKey];
      }
      if (!preset) return;

      // Onboarding scores default strictly to Basic (20%) (Item 8)
      const clonedSkills = JSON.parse(JSON.stringify(preset.skills));
      clonedSkills.forEach(s => {
        s.score = 20; // Default all skills to Basic (20%)
      });
      appState.currentStack = clonedSkills;"""

    select_preset_replacement = """    function selectWizardPreset(presetKey) {
      const branchKey = appState.selectedStream || (appState.user && appState.user.branch) || 'ece';
      const stream = STREAM_DATA[branchKey] || STREAM_DATA.ece;
      let preset = null;

      if (SENIOR_ROLE_PRESETS[presetKey]) {
        preset = SENIOR_ROLE_PRESETS[presetKey];
      } else if (stream && stream.presets && stream.presets[presetKey]) {
        preset = stream.presets[presetKey];
      } else if (stream && stream.presets) {
        preset = Object.values(stream.presets)[0];
      }
      if (!preset) return;

      // Default all skills to Intermediate (35%)
      const clonedSkills = JSON.parse(JSON.stringify(preset.skills));
      clonedSkills.forEach(s => {
        s.score = 35; // Default all skills to Intermediate (35%)
      });
      appState.currentStack = clonedSkills;"""

    if select_preset_anchor in content:
        content = content.replace(select_preset_anchor, select_preset_replacement, 1)
        print("Fix 4 (selectWizardPreset default score 35% Intermediate) applied.")
    else:
        print("WARNING: select_preset_anchor not found!")

    # 5. Update startSkillEvaluationWithoutSignup to ensure role, year 3, branch, and presets are pre-initialized
    start_eval_anchor = """    function startSkillEvaluationWithoutSignup() {
      appState.currentWizardStep = 1;
      const modal = document.getElementById('onboardingModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      const title = document.getElementById('wizardStepTitle');
      if (title) title.innerText = "Step 1: Academic Profile, Stream & Target Role";
      
      const streamKey = getActiveStreamKey();
      const branchSel = document.getElementById('obBranch');
      if (branchSel) branchSel.value = streamKey;

      if (!appState.selectedRole) {
        selectWizardRole('student');
      }
      updateWizardUI();
      showToast("Evaluation mode: choose your stream, role & skills to get your personalized roadmap!");
    }"""

    start_eval_replacement = """    function startSkillEvaluationWithoutSignup() {
      appState.currentWizardStep = 1;
      const modal = document.getElementById('onboardingModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
      const title = document.getElementById('wizardStepTitle');
      if (title) title.innerText = "Step 1: Academic Profile, Stream & Target Role";
      
      const streamKey = getActiveStreamKey() || 'ece';
      appState.selectedStream = streamKey;
      const branchSel = document.getElementById('obBranch');
      if (branchSel) branchSel.value = streamKey;

      if (!appState.selectedRole) {
        selectWizardRole('student');
      }
      // Pre-select Year 3 so student is immediately unblocked
      if (!appState.selectedYear) {
        selectWizardYear(3);
      }
      onWizardBranchChanged(streamKey);
      updateWizardYearButtons();
      updateWizardUI();
      showToast("Evaluation mode: choose your stream, role & skills to get your personalized roadmap!");
    }"""

    if start_eval_anchor in content:
        content = content.replace(start_eval_anchor, start_eval_replacement, 1)
        print("Fix 5 (startSkillEvaluationWithoutSignup initialization) applied.")
    else:
        print("WARNING: start_eval_anchor not found!")

    # 6. Update renderWizardSkillLevelInputs to default uninitialized skills to Intermediate (35%)
    render_skills_anchor = """    function renderWizardSkillLevelInputs() {
      const container = document.getElementById('wizardSkillLevelInputs');
      if (!container) return;
      container.innerHTML = '';

      appState.currentStack.forEach((s, idx) => {
        // Default to Basic (20%)
        if (!s.score) s.score = 20;
        const currentScore = s.score;"""

    render_skills_replacement = """    function renderWizardSkillLevelInputs() {
      const container = document.getElementById('wizardSkillLevelInputs');
      if (!container) return;
      container.innerHTML = '';

      if (!appState.currentStack || appState.currentStack.length === 0) {
        const branchKey = appState.selectedStream || 'ece';
        const stream = STREAM_DATA[branchKey] || STREAM_DATA.ece;
        const defPreset = (stream && (stream.defaultPreset || Object.keys(stream.presets)[0])) || 'firmware';
        const preset = (stream && stream.presets && stream.presets[defPreset]) || Object.values((stream && stream.presets) || {})[0];
        if (preset) {
          const cloned = JSON.parse(JSON.stringify(preset.skills));
          cloned.forEach(s => s.score = 35);
          appState.currentStack = cloned;
        }
      }

      (appState.currentStack || []).forEach((s, idx) => {
        // Default to Intermediate (35%)
        if (s.score === undefined || s.score === null) s.score = 35;
        const currentScore = s.score;"""

    if render_skills_anchor in content:
        content = content.replace(render_skills_anchor, render_skills_replacement, 1)
        print("Fix 6 (renderWizardSkillLevelInputs default Intermediate 35%) applied.")
    else:
        print("WARNING: render_skills_anchor not found!")

    # 7. Update updateWizardUI to populate Step 2 presets and custom checkboxes, and Step 3 inputs dynamically
    update_wizard_ui_anchor = """      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot${i}`);
        if (i < appState.currentWizardStep) {
          dot.className = "w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold";
          dot.innerText = "✓";
        } else if (i === appState.currentWizardStep) {
          dot.className = "w-6 h-6 rounded-full bg-[#008080] text-white flex items-center justify-center text-xs font-bold";
          dot.innerText = i;
        } else {
          dot.className = "w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold";
          dot.innerText = i;
        }
      }

      // Populate Step 4 summary when on Step 4
      if (appState.currentWizardStep === 4) {"""

    update_wizard_ui_replacement = """      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`dot${i}`);
        if (dot) {
          if (i < appState.currentWizardStep) {
            dot.className = "w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold";
            dot.innerText = "✓";
          } else if (i === appState.currentWizardStep) {
            dot.className = "w-6 h-6 rounded-full bg-[#008080] text-white flex items-center justify-center text-xs font-bold";
            dot.innerText = i;
          } else {
            dot.className = "w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold";
            dot.innerText = i;
          }
        }
      }

      const branchKey = (document.getElementById('obBranch') && document.getElementById('obBranch').value) 
        || appState.selectedStream 
        || (appState.user && appState.user.branch) 
        || 'ece';
      appState.selectedStream = branchKey;

      // Handle Step 2 dynamic population of focus cluster presets
      if (appState.currentWizardStep === 2) {
        const streamLabel = document.getElementById('wizardStreamLabel');
        if (streamLabel && STREAM_DATA[branchKey]) {
          streamLabel.innerText = `Stream: ${STREAM_DATA[branchKey].shortName || STREAM_DATA[branchKey].name}`;
        }
        renderWizardPresets(branchKey);
        if (!appState.currentStack || appState.currentStack.length === 0) {
          const defPreset = (STREAM_DATA[branchKey] && (STREAM_DATA[branchKey].defaultPreset || Object.keys(STREAM_DATA[branchKey].presets)[0])) || 'firmware';
          selectWizardPreset(defPreset);
        } else {
          renderWizardCustomSkillsCheckboxes();
        }
      }

      // Handle Step 3 dynamic population of skill levels (Intermediate 35% by default)
      if (appState.currentWizardStep === 3) {
        renderWizardSkillLevelInputs();
      }

      // Populate Step 4 summary when on Step 4
      if (appState.currentWizardStep === 4) {"""

    if update_wizard_ui_anchor in content:
        content = content.replace(update_wizard_ui_anchor, update_wizard_ui_replacement, 1)
        print("Fix 7 (updateWizardUI Step 2 & 3 dynamic population) applied.")
    else:
        print("WARNING: update_wizard_ui_anchor not found!")

    # 8. Update nextWizardStep so advancing from Step 1 syncs branch and role year smoothly
    next_step_anchor = """    function nextWizardStep() {
      if (appState.currentWizardStep === 1) {
        if (appState.selectedRole === 'student' && !appState.selectedYear) {
          showToast("Please select your current B.Tech year (1st to 4th year) to continue.");
          return;
        }
      }
      if (appState.currentWizardStep < 4) {
        appState.currentWizardStep++;
        updateWizardUI();
      } else {"""

    next_step_replacement = """    function nextWizardStep() {
      if (appState.currentWizardStep === 1) {
        const branch = (document.getElementById('obBranch') && document.getElementById('obBranch').value) 
          || appState.selectedStream 
          || (appState.user && appState.user.branch) 
          || 'ece';
        appState.selectedStream = branch;

        if (appState.selectedRole === 'student' && !appState.selectedYear) {
          appState.selectedYear = 3;
          updateWizardYearButtons();
        }
      }
      if (appState.currentWizardStep < 4) {
        appState.currentWizardStep++;
        updateWizardUI();
      } else {"""

    if next_step_anchor in content:
        content = content.replace(next_step_anchor, next_step_replacement, 1)
        print("Fix 8 (nextWizardStep sync branch & default year 3) applied.")
    else:
        print("WARNING: next_step_anchor not found!")

    # 9. Update quickFacultyLogin with safe error handling and guaranteed navigation to analyzer
    quick_login_anchor = """    function quickFacultyLogin() {
      const streamKey = 'ece';
      appState.activeRole = 'learner';
      appState.selectedStream = streamKey;

      // Fully populated Demo User Portfolio
      appState.user = {
        id: 'USR-DEMO-001',
        name: 'Rohan Varma',
        email: 'rohan@btech.ac.in',
        username: 'rohan_ece',
        college: 'Gujarat Technological University (GTU Affiliate)',
        year: 3,
        branch: streamKey,
        stream: streamKey,
        role: 'learner',
        isDemo: true,
        verified: true,
        verifiedReady: true,
        verifiedToken: 'BTECH-2026-ECE-702',
        activeTrackPreset: 'firmware',
        initialLevel: 'advanced',
        baselineDate: '2026-10-01',
        totalStudyMinutes: 312,
        streakDays: 6,
        mcqHistory: [
          { id: 101, date: '2026-10-12', module: 'Embedded C & ARM Cortex-M Hardware', score: 85, mode: 10, passed: true },
          { id: 102, date: '2026-10-15', module: 'FreeRTOS & Real-Time Kernel Internals', score: 90, mode: 20, passed: true }
        ],
        skillTimes: {
          'Embedded C & Register I/O': 180,
          'FreeRTOS & Real-Time Kernels': 132
        },
        completedLessonsBySkill: {
          'emb_c': [0, 1, 2, 3, 4, 5, 6, 7],
          'rtos': [0, 1, 2, 3, 4]
        },
        completedMarathons: {
          'ece': true
        }
      };

      appState.mcqHistory = JSON.parse(JSON.stringify(appState.user.mcqHistory));
      appState.progress = {
        totalStudyMinutes: 312,
        streakDays: 6,
        learningSessions: [
          { id: 1, date: '2026-10-16 14:30', title: 'STM32 NVIC & DMA Peripheral Architecture', skill: 'Embedded C & Register I/O', duration: '45m', category: 'Video Lecture' },
          { id: 2, date: '2026-10-15 11:00', title: 'FreeRTOS Mutex Priority Inheritance Analysis', skill: 'FreeRTOS & Real-Time Kernels', duration: '60m', category: 'Video Lecture' }
        ],
        completedChallenges: [],
        completedResourceIds: ['emb_c', 'rtos'],
        completedLessonsBySkill: JSON.parse(JSON.stringify(appState.user.completedLessonsBySkill)),
        completedMarathons: { 'ece': true }
      };

      // Close all modals immediately (no onboarding wizard popup!)
      closeAuthModal();
      if (typeof closeOnboardingModal === 'function') closeOnboardingModal();
      const obModal = document.getElementById('onboardingModal');
      if (obModal) { obModal.classList.add('hidden'); obModal.classList.remove('flex'); }

      // Set role buttons UI
      const learnerBtn = document.getElementById('roleBtn-learner');
      const recruiterBtn = document.getElementById('roleBtn-recruiter');
      const learnerNav = document.getElementById('navLearnerItems');
      const recruiterNav = document.getElementById('navRecruiterItems');
      if (learnerBtn) learnerBtn.className = "px-2.5 py-1 rounded-md font-semibold text-slate-900 bg-white shadow-xs transition-all";
      if (recruiterBtn) recruiterBtn.className = "px-2.5 py-1 rounded-md font-medium text-slate-500 hover:text-slate-800 transition-all";
      if (learnerNav) { learnerNav.classList.remove('hidden'); learnerNav.classList.add('flex'); }
      if (recruiterNav) { recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('flex'); }

      // Direct apply stream change (bypassing the wizard!)
      applyStreamChange(streamKey, false);

      // Populate currentStack with firmware skills & compute composite verified scores
      const stream = STREAM_DATA.ece;
      const preset = stream.presets.firmware;
      appState.currentStack = JSON.parse(JSON.stringify(preset.skills));
      appState.currentStack.forEach(s => {
        s.score = calculateCompositeSkillScore(s);
      });

      // Synchronize selectors
      const navSelect = document.getElementById('navStreamSelect');
      if (navSelect) navSelect.value = streamKey;
      updateNavStreamLabel(streamKey);
      updateActiveStudentHeaderBadge();

      // Save state to storage
      saveStateToStorage();
      updateAuthUI();

      // Render all views
      renderStreamPresetButtons();
      renderCurriculumComparison();
      renderResourcesForStream();
      renderMcqModulesForStream();
      renderSkillLevelDiagram();
      renderOneShotMarathonCards();
      runLiveRecalculations();
      updateGrowthSummaryCards();
      updateCharts();

      // Navigate to Learn/Analyzer screen
      navigateTo('analyzer');
      showToast("Demo Loaded: Rohan Varma (ECE 3rd-Year Verified Portfolio).");
    }"""

    quick_login_replacement = """    function quickFacultyLogin() {
      try {
        const streamKey = 'ece';
        appState.activeRole = 'learner';
        appState.selectedStream = streamKey;

        // Fully populated Demo User Portfolio
        appState.user = {
          id: 'USR-DEMO-001',
          name: 'Rohan Varma',
          email: 'rohan@btech.ac.in',
          username: 'rohan_ece',
          college: 'Gujarat Technological University (GTU Affiliate)',
          year: 3,
          branch: streamKey,
          stream: streamKey,
          role: 'learner',
          isDemo: true,
          verified: true,
          verifiedReady: true,
          verifiedToken: 'BTECH-2026-ECE-702',
          activeTrackPreset: 'firmware',
          initialLevel: 'advanced',
          baselineDate: '2026-10-01',
          totalStudyMinutes: 312,
          streakDays: 6,
          mcqHistory: [
            { id: 101, date: '2026-10-12', module: 'Embedded C & ARM Cortex-M Hardware', score: 85, mode: 10, passed: true },
            { id: 102, date: '2026-10-15', module: 'FreeRTOS & Real-Time Kernel Internals', score: 90, mode: 20, passed: true }
          ],
          skillTimes: {
            'Embedded C & Register I/O': 180,
            'FreeRTOS & Real-Time Kernels': 132
          },
          completedLessonsBySkill: {
            'emb_c': [0, 1, 2, 3, 4, 5, 6, 7],
            'rtos': [0, 1, 2, 3, 4]
          },
          completedMarathons: {
            'ece': true
          }
        };

        appState.mcqHistory = JSON.parse(JSON.stringify(appState.user.mcqHistory));
        appState.progress = {
          totalStudyMinutes: 312,
          streakDays: 6,
          learningSessions: [
            { id: 1, date: '2026-10-16 14:30', title: 'STM32 NVIC & DMA Peripheral Architecture', skill: 'Embedded C & Register I/O', duration: '45m', category: 'Video Lecture' },
            { id: 2, date: '2026-10-15 11:00', title: 'FreeRTOS Mutex Priority Inheritance Analysis', skill: 'FreeRTOS & Real-Time Kernels', duration: '60m', category: 'Video Lecture' }
          ],
          completedChallenges: [],
          completedResourceIds: ['emb_c', 'rtos'],
          completedLessonsBySkill: JSON.parse(JSON.stringify(appState.user.completedLessonsBySkill)),
          completedMarathons: { 'ece': true }
        };

        // Close all modals immediately (no onboarding wizard popup!)
        closeAuthModal();
        if (typeof closeOnboardingModal === 'function') closeOnboardingModal();
        const obModal = document.getElementById('onboardingModal');
        if (obModal) { obModal.classList.add('hidden'); obModal.classList.remove('flex'); }

        // Set role buttons UI
        const learnerBtn = document.getElementById('roleBtn-learner');
        const recruiterBtn = document.getElementById('roleBtn-recruiter');
        const learnerNav = document.getElementById('navLearnerItems');
        const recruiterNav = document.getElementById('navRecruiterItems');
        if (learnerBtn) learnerBtn.className = "px-2.5 py-1 rounded-md font-semibold text-slate-900 bg-white shadow-xs transition-all";
        if (recruiterBtn) recruiterBtn.className = "px-2.5 py-1 rounded-md font-medium text-slate-500 hover:text-slate-800 transition-all";
        if (learnerNav) { learnerNav.classList.remove('hidden'); learnerNav.classList.add('flex'); }
        if (recruiterNav) { recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('flex'); }

        // Direct apply stream change (bypassing the wizard!)
        applyStreamChange(streamKey, false);

        // Populate currentStack with firmware skills & compute composite verified scores
        if (typeof STREAM_DATA !== 'undefined' && STREAM_DATA.ece && STREAM_DATA.ece.presets && STREAM_DATA.ece.presets.firmware) {
          const stream = STREAM_DATA.ece;
          const preset = stream.presets.firmware;
          appState.currentStack = JSON.parse(JSON.stringify(preset.skills));
          appState.currentStack.forEach(s => {
            if (typeof calculateCompositeSkillScore === 'function') {
              s.score = calculateCompositeSkillScore(s);
            }
          });
        }

        // Synchronize selectors
        const navSelect = document.getElementById('navStreamSelect');
        if (navSelect) navSelect.value = streamKey;
        updateNavStreamLabel(streamKey);
        updateActiveStudentHeaderBadge();

        // Save state to storage
        saveStateToStorage();
        updateAuthUI();

        // Render all views safely
        if (typeof renderStreamPresetButtons === 'function') renderStreamPresetButtons();
        if (typeof renderCurriculumComparison === 'function') renderCurriculumComparison();
        if (typeof renderResourcesForStream === 'function') renderResourcesForStream();
        if (typeof renderMcqModulesForStream === 'function') renderMcqModulesForStream();
        if (typeof renderSkillLevelDiagram === 'function') renderSkillLevelDiagram();
        if (typeof renderOneShotMarathonCards === 'function') renderOneShotMarathonCards();
        if (typeof runLiveRecalculations === 'function') runLiveRecalculations();
        if (typeof updateGrowthSummaryCards === 'function') updateGrowthSummaryCards();
        if (typeof updateCharts === 'function') updateCharts();

        // Navigate to Learn/Analyzer screen
        navigateTo('analyzer');
        showToast("Demo Loaded: Rohan Varma (ECE 3rd-Year Verified Portfolio).");
      } catch (err) {
        console.error("quickFacultyLogin caught error:", err);
        navigateTo('analyzer');
        showToast("Demo Loaded (Navigated to Learn Screen).");
      }
    }"""

    if quick_login_anchor in content:
        content = content.replace(quick_login_anchor, quick_login_replacement, 1)
        print("Fix 9 (quickFacultyLogin robust execution & fallback) applied.")
    else:
        print("WARNING: quick_login_anchor not found!")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("index.html successfully updated!")

if __name__ == '__main__':
    apply_fixes()
