# -*- coding: utf-8 -*-
"""
Fix Demo Login:
Upgrades quickFacultyLogin() and quickRecruiterLogin() to cleanly load
the full demo portfolio without triggering the onboarding wizard modal.
"""

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

old_quick_faculty_login = '''    function quickFacultyLogin() {
      appState.user = {
        name: 'Rohan Varma',
        email: 'rohan@btech.ac.in',
        college: 'Gujarat Technological University (GTU Affiliate)',
        year: 3,
        branch: 'ece',
        role: 'learner',
        activeTrackPreset: 'firmware',
        verifiedReady: true,
        verifiedToken: 'BTECH-2026-ECE-702'
      };
      saveStateToStorage();
      updateAuthUI();
      closeAuthModal();
      switchGlobalStream('ece');
      navigateTo('analyzer');
      showToast("🎓 Demo loaded: Rohan Varma (ECE 3rd-Year Verified Portfolio).");
    }

    function quickRecruiterLogin() {
      appState.user = {
        name: 'Dr. Vikram Kulkarni',
        email: 'v.kulkarni@qualcomm.com',
        college: 'Qualcomm Systems & Hardware Architecture',
        year: 0,
        branch: 'ece',
        role: 'recruiter',
        activeTrackPreset: 'firmware',
        verifiedReady: true,
        verifiedToken: 'REC-QUALCOMM-2026'
      };
      saveStateToStorage();
      updateAuthUI();
      closeAuthModal();
      setRole('recruiter');
      showToast("🏢 Recruiter demo loaded: Dr. Vikram Kulkarni (Qualcomm).");
    }'''

new_quick_faculty_login = '''    function quickFacultyLogin() {
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
    }

    function quickRecruiterLogin() {
      appState.user = {
        id: 'USR-DEMO-REC-001',
        name: 'Dr. Vikram Kulkarni',
        email: 'v.kulkarni@qualcomm.com',
        college: 'Qualcomm Systems & Hardware Architecture',
        year: 0,
        branch: 'ece',
        stream: 'ece',
        role: 'recruiter',
        isDemo: true,
        verified: true,
        verifiedReady: true,
        verifiedToken: 'REC-QUALCOMM-2026'
      };
      closeAuthModal();
      if (typeof closeOnboardingModal === 'function') closeOnboardingModal();
      const obModal = document.getElementById('onboardingModal');
      if (obModal) { obModal.classList.add('hidden'); obModal.classList.remove('flex'); }

      saveStateToStorage();
      updateAuthUI();
      setRole('recruiter');
      showToast("Recruiter Demo Loaded: Dr. Vikram Kulkarni (Qualcomm Systems).");
    }'''

if old_quick_faculty_login in content:
    content = content.replace(old_quick_faculty_login, new_quick_faculty_login, 1)
    print("[OK] Upgraded quickFacultyLogin() and quickRecruiterLogin() successfully!")
else:
    print("! Error: Could not find old_quick_faculty_login")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated index.html ({len(content)} bytes)")
