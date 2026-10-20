import os
import sys

def apply_mobile_overhaul():
    path = 'index.html'
    with open(path, 'rb') as f:
        data = f.read().decode('utf-8')

    # Detect line endings
    crlf = '\r\n' in data
    sep = '\r\n' if crlf else '\n'

    # 1. Update Viewport Meta
    old_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    new_viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">'
    if old_viewport in data:
        data = data.replace(old_viewport, new_viewport, 1)
        print("[OK] Viewport meta updated")
    else:
        print("- Viewport meta already updated or not found")

    # 2. Add Mobile CSS Rules in <style>
    target_style = f"""    /* Prevent horizontal overflow on mobile viewports */
    html, body {{
      overflow-x: hidden !important;
      width: 100%;
      max-width: 100vw;
    }}"""
    if crlf:
        target_style = target_style.replace('\n', '\r\n')

    replacement_style = f"""    /* Prevent horizontal overflow on mobile viewports & Root Box Model */
    html {{
      box-sizing: border-box;
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden !important;
      -webkit-text-size-adjust: 100%;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }}
    *, *::before, *::after {{
      box-sizing: inherit;
    }}
    body {{
      overflow-x: hidden !important;
      width: 100%;
      max-width: 100vw;
      margin: 0;
      padding: 0;
    }}
    #root, #app, main, .screen-view, #screen-home, #screen-analyzer, #screen-resources, #screen-mcq, #screen-growth, #screen-events {{
      width: 100%;
      max-width: 100vw;
      overflow-x: hidden;
      box-sizing: border-box;
    }}

    /* Radar Chart Container Responsiveness */
    .radar-chart-container {{
      width: 100% !important;
      max-width: 100% !important;
      min-height: 280px;
      height: 320px;
      position: relative;
    }}

    /* Mobile Fluid Modals & Form Dialog Boundaries */
    @media (max-width: 640px) {{
      .modal-dialog,
      #authModal > div > div,
      #onboardingModal > div,
      #deviceBVerifiedModal > div,
      #shareModal > div,
      #resourceModal > div,
      #adminAuthModal > div,
      #candidateDossierModal > div,
      #databaseViewerModal > div {{
        width: calc(100% - 24px) !important;
        max-width: 440px !important;
        margin: 12px auto !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
      }}
      .card-mobile-compact {{
        padding: 12px !important;
      }}
    }}

    /* Prevent Mobile Browser/iOS Auto-Zoom on Form Focus */
    @media (max-width: 768px) {{
      input, select, textarea {{
        font-size: 16px !important;
      }}
      button:not(.btn-compact-allow), a:not(.link-compact-allow) {{
        min-height: 40px;
      }}
    }}"""
    if crlf:
        replacement_style = replacement_style.replace('\n', '\r\n')

    if target_style in data:
        data = data.replace(target_style, replacement_style, 1)
        print("[OK] Style tag updated with global overflow lock and mobile rules")
    else:
        print("! target_style not found directly, checking partial")

    # 3. Mobile Header: Brand Logo constraint & compact mobile buttons
    target_brand = """        <!-- Brand Logo & Title -->
        <div class="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <div class="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none" onclick="navigateTo('home')">
            <div class="w-8 h-8 rounded-lg bg-[#0B132B] dark:bg-slate-800 flex items-center justify-center text-teal-400 font-extrabold text-sm shadow-md border border-teal-500/30 shrink-0">
              <i class="fa-solid fa-microchip text-teal-400 text-sm"></i>
            </div>
            <div>
              <div class="flex items-center space-x-1.5">
                <span class="font-extrabold text-sm sm:text-[15px] tracking-tight text-slate-900 dark:text-white">Campus<span class="text-[#008080] dark:text-teal-400">2Career</span></span>
                <span class="text-[8px] px-1 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-[#008080] dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 uppercase hidden sm:inline-block" id="navVersionBadge">v5.5 FOCUS</span>
              </div>
              <p class="text-[9px] text-slate-400 dark:text-slate-500 leading-none mt-0.5 hidden 2xl:block">Personalized Core Skill Competence Engine</p>
            </div>
          </div>
        </div>"""
    if crlf:
        target_brand = target_brand.replace('\n', '\r\n')

    replacement_brand = """        <!-- Brand Logo & Title (Occupies <= 40% on mobile viewports) -->
        <div class="flex items-center space-x-2 sm:space-x-2.5 shrink-0 max-w-[40%] sm:max-w-none min-w-0">
          <div class="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none min-w-0" onclick="navigateTo('home')">
            <div class="w-8 h-8 rounded-lg bg-[#0B132B] dark:bg-slate-800 flex items-center justify-center text-teal-400 font-extrabold text-sm shadow-md border border-teal-500/30 shrink-0">
              <i class="fa-solid fa-microchip text-teal-400 text-sm"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center space-x-1.5 truncate">
                <span class="font-extrabold text-sm sm:text-[15px] tracking-tight text-slate-900 dark:text-white truncate">Campus<span class="text-[#008080] dark:text-teal-400">2Career</span></span>
                <span class="text-[8px] px-1 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-[#008080] dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 uppercase hidden sm:inline-block" id="navVersionBadge">v5.5 FOCUS</span>
              </div>
              <p class="text-[9px] text-slate-400 dark:text-slate-500 leading-none mt-0.5 hidden 2xl:block">Personalized Core Skill Competence Engine</p>
            </div>
          </div>
        </div>"""
    if crlf:
        replacement_brand = replacement_brand.replace('\n', '\r\n')

    if target_brand in data:
        data = data.replace(target_brand, replacement_brand, 1)
        print("[OK] Brand logo container updated with max-w-[40%]")
    else:
        print("! target_brand not found")

    # 4. Mobile Header Right Actions & Hamburger Button
    target_header_actions = """          <!-- User Profile Status / Auth Triggers -->
          <div id="authActionsLoggedOut" class="flex items-center space-x-1.5 shrink-0">
            <!-- 1-Click Interactive Demo Button (Always Visible directly on Left of Log In) -->
            <button type="button" onclick="quickFacultyLogin()" class="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer" title="Instant 1-Click Demo Platform (Preloaded Verified Account)">
              <i class="fa-solid fa-graduation-cap text-amber-600 dark:text-amber-400 text-xs"></i>
              <span>Demo</span>
            </button>
            <button type="button" onclick="openAuthModal('signin')" class="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs shrink-0 whitespace-nowrap">
              Log In
            </button>
            <button onclick="openAuthModal('signup')" class="text-xs bg-[#008080] hover:bg-[#006666] text-white font-bold px-3 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-all shrink-0 whitespace-nowrap flex items-center space-x-1">
              <i class="fa-solid fa-user-plus text-[10px]"></i>
              <span>Sign Up</span>
            </button>
          </div>

          <div id="authActionsLoggedIn" class="hidden items-center space-x-1.5 sm:space-x-2 shrink-0">
            <div class="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer shrink-0" onclick="navigateTo(appState.activeRole === 'recruiter' ? 'recruiter-candidates' : 'growth')">
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span id="userPillName" class="font-bold text-slate-800 dark:text-slate-200 max-w-[80px] sm:max-w-[110px] truncate">Aryan S.</span>
              <span id="userPillRoleBadge" class="hidden xs:inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">Learner</span>
            </div>
            <!-- Prominent Explicit Log Out Button -->
            <button type="button" onclick="handleLogout()" id="navLogoutBtn" title="Log Out / End Session" class="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 transition-all shadow-2xs shrink-0 cursor-pointer">
              <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              <span class="font-bold">Log Out</span>
            </button>
          </div>

          <!-- Mobile Hamburger Menu Button (Accessible >=44px Touch Target) -->
          <button id="mobileMenuToggleBtn" onclick="toggleMobileNav()" class="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 flex items-center justify-center min-w-[42px] min-h-[42px]" aria-label="Toggle navigation menu" title="Navigation Menu">
            <i id="mobileMenuIcon" class="fa-solid fa-bars text-base"></i>
          </button>"""
    if crlf:
        target_header_actions = target_header_actions.replace('\n', '\r\n')

    replacement_header_actions = """          <!-- User Profile Status / Auth Triggers -->
          <div id="authActionsLoggedOut" class="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            <!-- 1-Click Interactive Demo Button (Hidden on compact mobile top bar, available in drawer) -->
            <button type="button" onclick="quickFacultyLogin()" class="hidden sm:inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer" title="Instant 1-Click Demo Platform (Preloaded Verified Account)">
              <i class="fa-solid fa-graduation-cap text-amber-600 dark:text-amber-400 text-xs"></i>
              <span>Demo</span>
            </button>
            <button type="button" onclick="openAuthModal('signin')" class="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs shrink-0 whitespace-nowrap min-h-[40px] flex items-center justify-center">
              Log In
            </button>
            <button onclick="openAuthModal('signup')" class="hidden sm:inline-flex text-xs bg-[#008080] hover:bg-[#006666] text-white font-bold px-3 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-all shrink-0 whitespace-nowrap items-center space-x-1">
              <i class="fa-solid fa-user-plus text-[10px]"></i>
              <span>Sign Up</span>
            </button>
          </div>

          <div id="authActionsLoggedIn" class="hidden items-center space-x-1 sm:space-x-1.5 shrink-0">
            <div class="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer shrink-0" onclick="navigateTo(appState.activeRole === 'recruiter' ? 'recruiter-candidates' : 'growth')">
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span id="userPillName" class="font-bold text-slate-800 dark:text-slate-200 max-w-[75px] sm:max-w-[110px] truncate">Aryan S.</span>
              <span id="userPillRoleBadge" class="hidden xs:inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">Learner</span>
            </div>
            <!-- Prominent Explicit Log Out Button (Header on >=640px, Drawer on mobile) -->
            <button type="button" onclick="handleLogout()" id="navLogoutBtn" title="Log Out / End Session" class="hidden sm:inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 transition-all shadow-2xs shrink-0 cursor-pointer">
              <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              <span class="font-bold">Log Out</span>
            </button>
          </div>

          <!-- Mobile Hamburger Menu Button (Accessible >=44px Touch Target) -->
          <button id="mobileMenuToggleBtn" onclick="toggleMobileNav()" class="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px]" aria-label="Toggle navigation menu" title="Navigation Menu">
            <i id="mobileMenuIcon" class="fa-solid fa-bars text-base"></i>
          </button>"""
    if crlf:
        replacement_header_actions = replacement_header_actions.replace('\n', '\r\n')

    if target_header_actions in data:
        data = data.replace(target_header_actions, replacement_header_actions, 1)
        print("[OK] Header right actions and 44px hamburger updated")
    else:
        print("! target_header_actions not found")

    # 5. Mobile Backdrop Overlay
    target_drawer_comment = "  <!-- MOBILE NAVIGATION DRAWER (Responsive & Touch Friendly) -->"
    replacement_drawer_with_backdrop = """  <!-- MOBILE NAVIGATION BACKDROP OVERLAY -->
  <div id="mobileNavBackdrop" onclick="toggleMobileNav(false)" class="hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 md:hidden transition-opacity"></div>

  <!-- MOBILE NAVIGATION DRAWER (Responsive & Touch Friendly) -->"""
    if crlf:
        target_drawer_comment = target_drawer_comment.replace('\n', '\r\n')
        replacement_drawer_with_backdrop = replacement_drawer_with_backdrop.replace('\n', '\r\n')

    if target_drawer_comment in data:
        data = data.replace(target_drawer_comment, replacement_drawer_with_backdrop, 1)
        print("[OK] Mobile navigation backdrop overlay added")
    else:
        print("! target_drawer_comment not found")

    # 6. Update toggleMobileNav in JS to control backdrop & body scroll
    target_toggle = """    function toggleMobileNav(forceState) {
      const drawer = document.getElementById('mobileNavDrawer');
      const icon = document.getElementById('mobileMenuIcon');
      if (!drawer) return;
      const isHidden = drawer.classList.contains('hidden');
      const show = (forceState !== undefined) ? forceState : isHidden;
      if (show) {
        drawer.classList.remove('hidden');
        if (icon) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        }
      } else {
        drawer.classList.add('hidden');
        if (icon) {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      }
    }"""
    if crlf:
        target_toggle = target_toggle.replace('\n', '\r\n')

    replacement_toggle = """    function toggleMobileNav(forceState) {
      const drawer = document.getElementById('mobileNavDrawer');
      const backdrop = document.getElementById('mobileNavBackdrop');
      const icon = document.getElementById('mobileMenuIcon');
      if (!drawer) return;
      const isHidden = drawer.classList.contains('hidden');
      const show = (forceState !== undefined) ? forceState : isHidden;
      if (show) {
        drawer.classList.remove('hidden');
        if (backdrop) backdrop.classList.remove('hidden');
        if (icon) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        }
        document.body.style.overflow = 'hidden';
      } else {
        drawer.classList.add('hidden');
        if (backdrop) backdrop.classList.add('hidden');
        if (icon) {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
        document.body.style.overflow = '';
      }
    }"""
    if crlf:
        replacement_toggle = replacement_toggle.replace('\n', '\r\n')

    if target_toggle in data:
        data = data.replace(target_toggle, replacement_toggle, 1)
        print("[OK] toggleMobileNav updated to manage backdrop and body overflow")
    else:
        print("! target_toggle not found")

    # 7. Radar Chart Container class
    target_radar_div = """          <div class="h-64 relative">
            <canvas id="customRadarChartCanvas"></canvas>
          </div>"""
    if crlf:
        target_radar_div = target_radar_div.replace('\n', '\r\n')

    replacement_radar_div = """          <div class="radar-chart-container relative">
            <canvas id="customRadarChartCanvas"></canvas>
          </div>"""
    if crlf:
        replacement_radar_div = replacement_radar_div.replace('\n', '\r\n')

    if target_radar_div in data:
        data = data.replace(target_radar_div, replacement_radar_div, 1)
        print("[OK] Radar chart container updated with .radar-chart-container")
    else:
        print("! target_radar_div not found")

    # 8. Onboarding Modal Stepper Dots: hide long text labels on mobile
    target_stepper = """      <!-- Stepper Progress Dots -->
      <div class="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2">
          <span id="dot1" class="w-6 h-6 rounded-full bg-[#008080] text-white flex items-center justify-center text-xs font-bold">1</span>
          <span class="text-slate-800 font-semibold">Academic Stream</span>
        </div>
        <div class="h-0.5 w-6 bg-slate-300"></div>
        <div class="flex items-center space-x-2">
          <span id="dot2" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs">2</span>
          <span class="text-slate-500 font-medium">Choose Core Skills</span>
        </div>
        <div class="h-0.5 w-6 bg-slate-300"></div>
        <div class="flex items-center space-x-2">
          <span id="dot3" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs">3</span>
          <span class="text-slate-500 font-medium">Skill Levels</span>
        </div>
        <div class="h-0.5 w-6 bg-slate-300"></div>
        <div class="flex items-center space-x-2">
          <span id="dot4" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs">4</span>
          <span class="text-slate-500 font-medium">View Diagram</span>
        </div>
      </div>"""
    if crlf:
        target_stepper = target_stepper.replace('\n', '\r\n')

    replacement_stepper = """      <!-- Stepper Progress Dots (Responsive Labels) -->
      <div class="px-3 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <span id="dot1" class="w-6 h-6 rounded-full bg-[#008080] text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
          <span class="text-slate-800 font-semibold hidden sm:inline">Academic Stream</span>
        </div>
        <div class="h-0.5 w-3 sm:w-6 bg-slate-300 shrink"></div>
        <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <span id="dot2" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs shrink-0">2</span>
          <span class="text-slate-500 font-medium hidden sm:inline">Choose Core Skills</span>
        </div>
        <div class="h-0.5 w-3 sm:w-6 bg-slate-300 shrink"></div>
        <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <span id="dot3" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs shrink-0">3</span>
          <span class="text-slate-500 font-medium hidden sm:inline">Skill Levels</span>
        </div>
        <div class="h-0.5 w-3 sm:w-6 bg-slate-300 shrink"></div>
        <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <span id="dot4" class="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-xs shrink-0">4</span>
          <span class="text-slate-500 font-medium hidden sm:inline">View Diagram</span>
        </div>
      </div>"""
    if crlf:
        replacement_stepper = replacement_stepper.replace('\n', '\r\n')

    if target_stepper in data:
        data = data.replace(target_stepper, replacement_stepper, 1)
        print("[OK] Onboarding stepper dots updated for mobile viewports")
    else:
        print("! target_stepper not found")

    # 9. Onboarding Step 1 Year Selection: 2x2 grid on mobile
    target_year_grid = """            <div class="grid grid-cols-4 gap-2 text-xs">
              <button type="button" onclick="selectWizardYear(1)" class="w-year-btn py-2 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all">1st Year</button>
              <button type="button" onclick="selectWizardYear(2)" class="w-year-btn py-2 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all">2nd Year</button>
              <button type="button" onclick="selectWizardYear(3)" class="w-year-btn py-2 border rounded-lg text-center font-semibold border-[#008080] bg-teal-50 text-[#008080] shadow-2xs transition-all">3rd Year</button>
              <button type="button" onclick="selectWizardYear(4)" class="w-year-btn py-2 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all">Final Year</button>
            </div>"""
    if crlf:
        target_year_grid = target_year_grid.replace('\n', '\r\n')

    replacement_year_grid = """            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button type="button" onclick="selectWizardYear(1)" class="w-year-btn py-2.5 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all min-h-[40px]">1st Year</button>
              <button type="button" onclick="selectWizardYear(2)" class="w-year-btn py-2.5 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all min-h-[40px]">2nd Year</button>
              <button type="button" onclick="selectWizardYear(3)" class="w-year-btn py-2.5 border rounded-lg text-center font-semibold border-[#008080] bg-teal-50 text-[#008080] shadow-2xs transition-all min-h-[40px]">3rd Year</button>
              <button type="button" onclick="selectWizardYear(4)" class="w-year-btn py-2.5 border rounded-lg text-center font-medium border-slate-200 hover:border-teal-500 text-slate-700 transition-all min-h-[40px]">Final Year</button>
            </div>"""
    if crlf:
        replacement_year_grid = replacement_year_grid.replace('\n', '\r\n')

    if target_year_grid in data:
        data = data.replace(target_year_grid, replacement_year_grid, 1)
        print("[OK] Wizard Step 1 year grid updated to grid-cols-2 sm:grid-cols-4")
    else:
        print("! target_year_grid not found")

    # 10. renderSkillLevelDiagram card padding, milestone grid, and action buttons
    target_skill_card = """        card.className = "bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-4";
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-xs font-bold text-slate-900 dark:text-white">${skill.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded ${skill.category && skill.category.includes('Leadership') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">${skill.category || 'Core Skill'}</span>
                ${isSkillVerified ? `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                    <i class="fa-solid fa-circle-check mr-1"></i> LIVE VERIFIED (${skill.score}%)
                  </span>
                ` : `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                    <i class="fa-solid fa-clock mr-1"></i> ${skill.status || `UNVERIFIED BASELINE (${skill.score}%)`}
                  </span>
                `}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ${isSkillVerified ? 'Verified competence via 10-MCQ Industrial Benchmark exam.' : 'Initial baseline calibration. Take the 10-MCQ benchmark exam to unlock verified scores (>50% to 100%).'}
              </p>
            </div>

            <!-- Level Gauge Badge (Prominent Big Font Percentage) -->
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-xl sm:text-2xl font-mono font-black ${tier.badgeBg} px-3 py-1 rounded-xl border shadow-xs tracking-tight">
                ${skill.score}%
              </span>
            </div>
          </div>

          <!-- Progress Bar with milestone ticks and fusion color -->
          <div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="h-full rounded-full transition-all duration-500" style="width: ${skill.score}%; background-color: ${skillFusion.hex}"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
              <span>Beginner (20%)</span>
              <span>Intermediate (35%)</span>
              <span>Advanced (48% Baseline)</span>
              <span>Production Master (100%)</span>
            </div>
          </div>

          <!-- TRANSPARENT COMPOSITE EVALUATION FORMULA BREAKDOWN PILL -->
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
          </div>

          <!-- Milestones & Diagnostic -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Milestone Achieved:</span>
              <p class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">${skill.currentMilestone || 'Fundamental syntax & baseline concepts'}</p>
            </div>
            <div class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
              <span class="text-[10px] font-bold text-[#008080] dark:text-teal-400 uppercase tracking-wider block mb-1">Next Milestone to Level Up:</span>
              <p class="text-teal-950 dark:text-teal-200 font-medium leading-relaxed">${skill.nextMilestone || 'Production architecture & high-throughput concurrency'}</p>
            </div>
          </div>

          <!-- ACTIONS: WATCH PLAYLIST OR VALIDATE IN MCQ (Manual tuning removed - baseline locked) -->
          <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-medium text-slate-500 flex items-center">
              <i class="fa-solid fa-lock text-slate-400 mr-1.5 text-[10px]"></i>
              <span>Baseline Level:</span>
              <span class="ml-1 font-bold ${tier.twText}">${tier.name} (${skill.score}%)</span>
              <span class="ml-1.5 text-[10px] text-slate-400 italic">(Locked &bull; Evaluated via 10-MCQ)</span>
            </div>

            <div class="flex items-center space-x-2">
              <button onclick="openSkillResourceViewer('${skill.id}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1">
                <i class="fa-brands fa-youtube"></i>
                <span>Study Video Playlist</span>
              </button>
              <button onclick="navigateTo('mcq')" class="px-3.5 py-1 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs">
                ${isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;'}
              </button>
            </div>
          </div>
        `;"""
    if crlf:
        target_skill_card = target_skill_card.replace('\n', '\r\n')

    replacement_skill_card = """        card.className = "bg-white dark:bg-[#0F172A] p-3 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition-all space-y-4";
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                <span class="text-xs font-bold text-slate-900 dark:text-white">${skill.name}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded ${skill.category && skill.category.includes('Leadership') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">${skill.category || 'Core Skill'}</span>
                ${isSkillVerified ? `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                    <i class="fa-solid fa-circle-check mr-1"></i> LIVE VERIFIED (${skill.score}%)
                  </span>
                ` : `
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
                    <i class="fa-solid fa-clock mr-1"></i> ${skill.status || `UNVERIFIED BASELINE (${skill.score}%)`}
                  </span>
                `}
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ${isSkillVerified ? 'Verified competence via 10-MCQ Industrial Benchmark exam.' : 'Initial baseline calibration. Take the 10-MCQ benchmark exam to unlock verified scores (>50% to 100%).'}
              </p>
            </div>

            <!-- Level Gauge Badge (Prominent Big Font Percentage) -->
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-xl sm:text-2xl font-mono font-black ${tier.badgeBg} px-3 py-1 rounded-xl border shadow-xs tracking-tight">
                ${skill.score}%
              </span>
            </div>
          </div>

          <!-- Progress Bar with milestone ticks and fusion color -->
          <div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="h-full rounded-full transition-all duration-500" style="width: ${skill.score}%; background-color: ${skillFusion.hex}"></div>
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
          </div>

          <!-- Milestones & Diagnostic (Stacks vertically on small screens) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Current Milestone Achieved:</span>
              <p class="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">${skill.currentMilestone || 'Fundamental syntax & baseline concepts'}</p>
            </div>
            <div class="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
              <span class="text-[10px] font-bold text-[#008080] dark:text-teal-400 uppercase tracking-wider block mb-1">Next Milestone to Level Up:</span>
              <p class="text-teal-950 dark:text-teal-200 font-medium leading-relaxed">${skill.nextMilestone || 'Production architecture & high-throughput concurrency'}</p>
            </div>
          </div>

          <!-- ACTIONS: Full width touch-friendly buttons on mobile -->
          <div class="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <div class="text-[11px] font-medium text-slate-500 flex items-center">
              <i class="fa-solid fa-lock text-slate-400 mr-1.5 text-[10px]"></i>
              <span>Baseline Level:</span>
              <span class="ml-1 font-bold ${tier.twText}">${tier.name} (${skill.score}%)</span>
              <span class="ml-1.5 text-[10px] text-slate-400 italic hidden sm:inline">(Locked &bull; Evaluated via 10-MCQ)</span>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button onclick="openSkillResourceViewer('${skill.id}')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer">
                <i class="fa-brands fa-youtube"></i>
                <span>Study Video Playlist</span>
              </button>
              <button onclick="navigateTo('mcq')" class="w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080] hover:bg-[#006666] text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center cursor-pointer">
                ${isSkillVerified ? 'Retake 10-MCQ Test' : 'Take 10-MCQ Test &rarr;'}
              </button>
            </div>
          </div>
        `;"""
    if crlf:
        replacement_skill_card = replacement_skill_card.replace('\n', '\r\n')

    if target_skill_card in data:
        data = data.replace(target_skill_card, replacement_skill_card, 1)
        print("[OK] renderSkillLevelDiagram card layout updated with mobile-responsive structure")
    else:
        print("! target_skill_card not found")

    # 11. renderWizardSkillLevelInputs: Responsive flex layout
    target_wizard_skills = """        const div = document.createElement('div');
        div.className = "p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex items-center justify-between";
        div.innerHTML = `
          <div>
            <span class="text-xs font-bold text-slate-900 dark:text-white">${s.name}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500 block">${s.category || 'Core Skill'}</span>
          </div>
          <div class="flex items-center space-x-1.5" id="wizardSkillBtns-${idx}">
            <button type="button" data-score="20" onclick="setWizardSkillScore(${idx}, 20)" class="w-skill-level-btn px-2.5 py-1 rounded-lg text-[10px] ${currentScore <= 25 ? 'bg-red-600 text-white font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all">Basic (20%)</button>
            <button type="button" data-score="35" onclick="setWizardSkillScore(${idx}, 35)" class="w-skill-level-btn px-2.5 py-1 rounded-lg text-[10px] ${currentScore > 25 && currentScore <= 40 ? 'bg-yellow-400 text-slate-950 font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all">Intermediate (35%)</button>
            <button type="button" data-score="48" onclick="setWizardSkillScore(${idx}, 48)" class="w-skill-level-btn px-2.5 py-1 rounded-lg text-[10px] ${currentScore > 40 ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all">Advanced (48%)</button>
          </div>
        `;"""
    if crlf:
        target_wizard_skills = target_wizard_skills.replace('\n', '\r\n')

    replacement_wizard_skills = """        const div = document.createElement('div');
        div.className = "p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2";
        div.innerHTML = `
          <div>
            <span class="text-xs font-bold text-slate-900 dark:text-white">${s.name}</span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500 block">${s.category || 'Core Skill'}</span>
          </div>
          <div class="flex items-center space-x-1.5 flex-wrap gap-1" id="wizardSkillBtns-${idx}">
            <button type="button" data-score="20" onclick="setWizardSkillScore(${idx}, 20)" class="w-skill-level-btn px-2.5 py-1.5 rounded-lg text-[10px] ${currentScore <= 25 ? 'bg-red-600 text-white font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all min-h-[36px]">Basic (20%)</button>
            <button type="button" data-score="35" onclick="setWizardSkillScore(${idx}, 35)" class="w-skill-level-btn px-2.5 py-1.5 rounded-lg text-[10px] ${currentScore > 25 && currentScore <= 40 ? 'bg-yellow-400 text-slate-950 font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all min-h-[36px]">Intermediate (35%)</button>
            <button type="button" data-score="48" onclick="setWizardSkillScore(${idx}, 48)" class="w-skill-level-btn px-2.5 py-1.5 rounded-lg text-[10px] ${currentScore > 40 ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'} transition-all min-h-[36px]">Advanced (48%)</button>
          </div>
        `;"""
    if crlf:
        replacement_wizard_skills = replacement_wizard_skills.replace('\n', '\r\n')

    if target_wizard_skills in data:
        data = data.replace(target_wizard_skills, replacement_wizard_skills, 1)
        print("[OK] renderWizardSkillLevelInputs updated for responsive wrapping")
    else:
        print("! target_wizard_skills not found")

    with open(path, 'wb') as f:
        f.write(data.encode('utf-8'))
    print("Done applying mobile overhaul to index.html!")

if __name__ == '__main__':
    apply_mobile_overhaul()
