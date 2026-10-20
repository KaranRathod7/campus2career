import sys

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add CSS in <style>
css_target = """    /* Admin Suite Navigation Tabs Horizontal Scroller */"""

css_addition = """    /* Top Navigation Container Invisible Horizontal Scrollbar */
    .nav-container::-webkit-scrollbar {
      display: none;
    }
    .nav-container {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
      overflow-x: auto;
      white-space: nowrap;
    }
    .nav-tab-btn {
      flex-shrink: 0;
    }

    /* Admin Suite Navigation Tabs Horizontal Scroller */"""

if css_target in content:
    content = content.replace(css_target, css_addition, 1)
    print("CSS rules added successfully.")
else:
    print("Error: css_target not found!")
    sys.exit(1)

# 2. Replace navbar markup from lines ~344 to ~402
# Let's find start and end
start_marker = "<!-- Brand Logo & Admin Button (Admin placed just right of Campus2Career) -->"
end_marker = "<!-- Global Stream Selector Pill (CLICKABLE ANYWHERE ON THE PILL) -->"

if start_marker not in content or end_marker not in content:
    print("Error: start_marker or end_marker not found!")
    sys.exit(1)

pre_nav = content.split(start_marker)[0]
rest = content.split(start_marker)[1]
post_nav = rest.split(end_marker)[1]

new_nav_markup = """<!-- Brand Logo & Title -->
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
        </div>

        <!-- Desktop Navigation Items (Edge-to-Edge Invisible Scrollbar Container) -->
        <div class="nav-container hidden md:flex items-center min-w-0 flex-1 mx-2 overflow-x-auto whitespace-nowrap">
          <!-- Desktop Navigation Items (Learner Mode) -->
          <nav id="navLearnerItems" class="flex items-center space-x-1 min-w-0">
            <!-- Home button is always visible even when logged out -->
            <button onclick="navigateTo('home')" id="navBtn-home" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-semibold rounded-lg text-[#008080] bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 border-b-2 border-[#008080] transition-all whitespace-nowrap">
              <i class="fa-solid fa-house mr-1"></i> Home
            </button>
            
            <!-- Navigation tabs: Learn, Revision, MCQs, Analytics, Seminars -->
            <div id="authenticatedNavTabs" class="flex items-center space-x-1 shrink-0">
              <button onclick="navigateTo('analyzer')" id="navBtn-analyzer" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
                <i class="fa-solid fa-graduation-cap mr-1 text-[#008080] dark:text-teal-400"></i> Learn
              </button>
              <button onclick="navigateTo('resources')" id="navBtn-resources" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
                <i class="fa-solid fa-fire text-amber-500 mr-1"></i> Revision
                <span id="trackerCounterNav" class="ml-1 px-1 py-0.2 bg-teal-100 dark:bg-teal-900 text-[#008080] dark:text-teal-300 text-[9px] rounded-full font-bold">2</span>
              </button>
              <button onclick="navigateTo('mcq')" id="navBtn-mcq" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
                <i class="fa-solid fa-vial-circle-check mr-1"></i> MCQs
              </button>
              <button onclick="navigateTo('growth')" id="navBtn-growth" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
                <i class="fa-solid fa-chart-line mr-1"></i> Analytics
              </button>
              <button onclick="navigateTo('events')" id="navBtn-events" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
                <i class="fa-solid fa-calendar-star mr-1"></i> Seminars
              </button>
            </div>
          </nav>

          <!-- Desktop Navigation Items (Recruiter Mode) -->
          <nav id="navRecruiterItems" class="hidden items-center space-x-1 shrink-0">
            <button onclick="navigateTo('recruiter-candidates')" id="navBtn-recruiter-candidates" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
              <i class="fa-solid fa-user-check mr-1"></i> Candidates
              <span class="ml-1 px-1 py-0.2 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[9px] rounded-full font-bold">14,821</span>
            </button>
            <button onclick="navigateTo('recruiter-invites')" id="navBtn-recruiter-invites" class="nav-tab-btn shrink-0 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all whitespace-nowrap">
              <i class="fa-solid fa-paper-plane mr-1"></i> Invitations
              <span id="recruiterInvitesCountBadge" class="ml-1 px-1 py-0.2 bg-teal-100 dark:bg-teal-900 text-[#008080] dark:text-teal-300 text-[9px] rounded-full font-bold">1</span>
            </button>
          </nav>
        </div>

        """

content = pre_nav + new_nav_markup + end_marker + post_nav
print("Navbar markup replaced successfully.")

# 3. Update setRole to cleanly handle classList with flex
setrole_target = """      if (role === 'recruiter') {
        if (learnerNav) { learnerNav.classList.add('hidden'); learnerNav.classList.remove('xl:flex'); }
        if (recruiterNav) { recruiterNav.classList.remove('hidden'); recruiterNav.classList.add('xl:flex'); }"""

setrole_replacement = """      if (role === 'recruiter') {
        if (learnerNav) { learnerNav.classList.add('hidden'); learnerNav.classList.remove('flex', 'xl:flex'); }
        if (recruiterNav) { recruiterNav.classList.remove('hidden'); recruiterNav.classList.add('flex'); }"""

if setrole_target in content:
    content = content.replace(setrole_target, setrole_replacement, 1)
    print("setRole recruiter branch updated successfully.")
else:
    print("Warning: setrole_target not found.")

setrole_target_else = """      } else {
        if (learnerNav) { learnerNav.classList.remove('hidden'); learnerNav.classList.add('xl:flex'); }
        if (recruiterNav) { recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('xl:flex'); }"""

setrole_replacement_else = """      } else {
        if (learnerNav) { learnerNav.classList.remove('hidden'); learnerNav.classList.add('flex'); }
        if (recruiterNav) { recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('flex', 'xl:flex'); }"""

if setrole_target_else in content:
    content = content.replace(setrole_target_else, setrole_replacement_else, 1)
    print("setRole learner branch updated successfully.")
else:
    print("Warning: setrole_target_else not found.")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("index.html saved successfully.")
