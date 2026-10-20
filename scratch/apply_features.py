# Script to apply all three features to index.html
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update style in head for overflow-x: hidden
style_target = '    /* Global Custom Scrollbars */'
style_replacement = '''    /* Prevent horizontal overflow on mobile viewports */
    html, body {
      overflow-x: hidden !important;
      width: 100%;
      max-width: 100vw;
    }

    /* Global Custom Scrollbars */'''

if style_target in content:
    content = content.replace(style_target, style_replacement, 1)
    print("1. Added overflow-x protection to html/body.")
else:
    print("Warning: style_target not found.")

# 2. Update navLearnerItems to hidden md:flex
old_nav_learner = '<nav id="navLearnerItems" class="flex items-center space-x-0.5 shrink">'
new_nav_learner = '<!-- Desktop Navigation Items (Learner Mode) - Hidden on mobile (<768px), visible on md+ -->\n        <nav id="navLearnerItems" class="hidden md:flex items-center space-x-0.5 shrink">'
if old_nav_learner in content:
    content = content.replace(old_nav_learner, new_nav_learner, 1)
    print("2. Updated navLearnerItems to hidden md:flex.")
else:
    print("Warning: old_nav_learner not found.")

# 3. Update navRecruiterItems to hidden md:flex
old_nav_recruiter = '<nav id="navRecruiterItems" class="hidden items-center space-x-1 shrink">'
new_nav_recruiter = '<!-- Desktop Navigation Items (Recruiter Mode) - Hidden on mobile (<768px), visible on md+ -->\n        <nav id="navRecruiterItems" class="hidden md:flex items-center space-x-1 shrink">'
if old_nav_recruiter in content:
    content = content.replace(old_nav_recruiter, new_nav_recruiter, 1)
    print("3. Updated navRecruiterItems to hidden md:flex.")
else:
    print("Warning: old_nav_recruiter not found.")

# 4. Update navStreamSelectorContainer to hidden lg:flex
old_stream_sel = '<div id="navStreamSelectorContainer" class="relative flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs transition-all shrink-0 cursor-pointer" title="Click anywhere to change engineering stream">'
new_stream_sel = '<div id="navStreamSelectorContainer" class="relative hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 text-xs shadow-2xs transition-all shrink-0 cursor-pointer" title="Click anywhere to change engineering stream">'
if old_stream_sel in content:
    content = content.replace(old_stream_sel, new_stream_sel, 1)
    print("4. Updated navStreamSelectorContainer to hidden lg:flex.")
else:
    print("Warning: old_stream_sel not found.")

# 5. Update headerRecruiterAccessBtn to hidden lg:inline-flex
old_rec_btn = 'class="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-teal-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 hidden sm:inline-flex items-center space-x-1.5 shadow-2xs"'
new_rec_btn = 'class="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#008080] dark:hover:text-teal-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shrink-0 hidden lg:inline-flex items-center space-x-1.5 shadow-2xs"'
if old_rec_btn in content:
    content = content.replace(old_rec_btn, new_rec_btn, 1)
    print("5. Updated headerRecruiterAccessBtn to hidden lg:inline-flex.")
else:
    print("Warning: old_rec_btn not found.")

# 6. Update authActionsLoggedIn to include prominent Log Out button
old_logged_in = '''          <div id="authActionsLoggedIn" class="hidden items-center space-x-1.5 shrink-0">
            <div class="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer shrink-0" onclick="navigateTo(appState.activeRole === 'recruiter' ? 'recruiter-candidates' : 'growth')">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span id="userPillName" class="font-bold text-slate-800 dark:text-slate-200 max-w-[85px] sm:max-w-[110px] truncate">Aryan S.</span>
              <span id="userPillRoleBadge" class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">Learner</span>
            </div>
            <button onclick="handleLogout()" title="Log Out / Switch User" class="p-1.5 text-slate-400 hover:text-red-600 transition-all text-xs shrink-0">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>'''

new_logged_in = '''          <div id="authActionsLoggedIn" class="hidden items-center space-x-1.5 sm:space-x-2 shrink-0">
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
          </div>'''

if old_logged_in in content:
    content = content.replace(old_logged_in, new_logged_in, 1)
    print("6. Updated authActionsLoggedIn with prominent Log Out button.")
else:
    # Try normalize line endings match
    old_norm = old_logged_in.replace('\r\n', '\n')
    cnt_norm = content.replace('\r\n', '\n')
    if old_norm in cnt_norm:
        content = cnt_norm.replace(old_norm, new_logged_in, 1)
        print("6. Updated authActionsLoggedIn (normalized).")
    else:
        print("Warning: old_logged_in not found.")

# 7. Update mobileMenuToggleBtn to md:hidden
old_toggle = '<button id="mobileMenuToggleBtn" onclick="toggleMobileNav()" class="xl:hidden'
new_toggle = '<button id="mobileMenuToggleBtn" onclick="toggleMobileNav()" class="md:hidden'
if old_toggle in content:
    content = content.replace(old_toggle, new_toggle, 1)
    print("7. Updated mobileMenuToggleBtn to md:hidden.")
else:
    print("Warning: old_toggle not found.")

# 8. Update mobileNavDrawer to md:hidden
old_drawer = '<div id="mobileNavDrawer" class="hidden xl:hidden fixed inset-x-0 top-[104px]'
new_drawer = '<div id="mobileNavDrawer" class="hidden md:hidden fixed inset-x-0 top-[100px] sm:top-[104px]'
if old_drawer in content:
    content = content.replace(old_drawer, new_drawer, 1)
    print("8. Updated mobileNavDrawer to md:hidden.")
else:
    print("Warning: old_drawer not found.")

# 9. Update bottom of mobileNavDrawer to include logged-in row with Log Out
old_mobile_auth = '''      <!-- Mobile Theme & Auth Row -->
      <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleDarkMode();" class="flex items-center space-x-2 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-h-[44px]">
          <i class="fa-solid fa-circle-half-stroke text-amber-500 text-sm"></i>
          <span>Dark / Light</span>
        </button>
        <div class="flex items-center space-x-2">
          <button onclick="openAuthModal('signin'); toggleMobileNav(false);" class="text-xs font-bold text-slate-700 dark:text-slate-200 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 min-h-[44px]">Log In</button>
          <button onclick="openAuthModal('signup'); toggleMobileNav(false);" class="text-xs font-bold text-white bg-[#008080] py-2 px-4 rounded-xl shadow-xs min-h-[44px]">Sign Up</button>
        </div>
      </div>'''

new_mobile_auth = '''      <!-- Mobile Theme & Auth Row (Logged Out) -->
      <div id="mobileAuthRowLoggedOut" class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleDarkMode();" class="flex items-center space-x-2 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-h-[44px]">
          <i class="fa-solid fa-circle-half-stroke text-amber-500 text-sm"></i>
          <span>Dark / Light</span>
        </button>
        <div class="flex items-center space-x-2">
          <button type="button" onclick="quickFacultyLogin(); toggleMobileNav(false);" class="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 py-2 px-2.5 rounded-xl min-h-[44px]">Demo</button>
          <button type="button" onclick="openAuthModal('signin'); toggleMobileNav(false);" class="text-xs font-bold text-slate-700 dark:text-slate-200 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 min-h-[44px]">Log In</button>
          <button type="button" onclick="openAuthModal('signup'); toggleMobileNav(false);" class="text-xs font-bold text-white bg-[#008080] py-2 px-4 rounded-xl shadow-xs min-h-[44px]">Sign Up</button>
        </div>
      </div>

      <!-- Mobile Theme & Auth Row (Logged In) with Explicit Log Out -->
      <div id="mobileAuthRowLoggedIn" class="hidden pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span id="mobileUserPillName" class="text-xs font-bold text-slate-800 dark:text-slate-200">User</span>
            <span id="mobileUserRoleBadge" class="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">Learner</span>
          </div>
          <button onclick="toggleDarkMode();" class="p-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" title="Toggle Theme">
            <i class="fa-solid fa-circle-half-stroke text-amber-500"></i>
          </button>
        </div>
        <button type="button" onclick="handleLogout(); toggleMobileNav(false);" class="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all min-h-[44px] cursor-pointer">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
          <span>Log Out of Campus2Career</span>
        </button>
      </div>'''

old_m_norm = old_mobile_auth.replace('\r\n', '\n')
cnt_norm = content.replace('\r\n', '\n')
if old_m_norm in cnt_norm:
    content = cnt_norm.replace(old_m_norm, new_mobile_auth, 1)
    print("9. Updated mobileNavDrawer auth row with Log Out.")
else:
    print("Warning: old_mobile_auth not found.")

# 10. Add Auto-Polling Beacon inside authVerifyStep
old_verify_step = '''          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">Enter 6-Digit Email Verification Code</label>'''

new_verify_step = '''          <!-- Cross-Device Auto-Verification Beacon -->
          <div class="p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-950/50 border border-teal-500/30 flex items-center justify-center space-x-2 text-center">
            <span class="relative flex h-2.5 w-2.5 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
            <span class="text-[11px] font-semibold text-teal-800 dark:text-teal-300">
              Auto-checking: Opening the email link on your phone or other device will verify this screen automatically!
            </span>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">Enter 6-Digit Email Verification Code</label>'''

old_v_norm = old_verify_step.replace('\r\n', '\n')
cnt_norm = content.replace('\r\n', '\n')
if old_v_norm in cnt_norm:
    content = cnt_norm.replace(old_v_norm, new_verify_step, 1)
    print("10. Added Cross-Device Auto-Verification Beacon to authVerifyStep.")
else:
    print("Warning: old_verify_step not found.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Batch 1 completed successfully.")
