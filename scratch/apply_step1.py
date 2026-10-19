# -*- coding: utf-8 -*-
"""
Apply all requested changes to index.html and server.py:
1. Admin button just right of Campus2Career
2. Remove Complete & Level Up (+5%) button and manual marathon complete button
3. Sovereign Admin Portal Modal containing full candidate database (credentials, passwords, progress, test analyses, SMTP setup, mailbox)
4. Default website open is not in demo mode
5. Remove Curated Free YouTube Roadmaps and Recruiter Portal (Screenshot 4)
6. Remove Example A, B, C, D boxes (Screenshot 5)
7. Ensure email sending, verification, and analyses work seamlessly
"""
import re
import sys

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

print("Original index.html length:", len(content))

# -----------------------------------------------------------------------------
# 1. NAVBAR: Move Admin button to just right of Campus2Career brand
# -----------------------------------------------------------------------------
old_brand_and_nav = """        <!-- Brand Logo -->
        <div class="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none shrink-0" onclick="navigateTo('home')">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B132B] dark:bg-slate-800 flex items-center justify-center text-teal-400 font-extrabold text-lg sm:text-xl shadow-md border border-teal-500/30 shrink-0">
            <i class="fa-solid fa-microchip text-teal-400 text-base sm:text-lg"></i>
          </div>
          <div>
            <div class="flex items-center space-x-1.5">
              <span class="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">Campus<span class="text-[#008080] dark:text-teal-400">2Career</span></span>
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-[#008080] dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 uppercase" id="navVersionBadge">v5.5 FOCUS</span>
            </div>
            <p class="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 leading-none hidden lg:block">Personalized Core Skill Competence Engine</p>
          </div>
        </div>

        <!-- Desktop Navigation Items (Learner Mode) -->
        <nav id="navLearnerItems" class="flex items-center space-x-0.5 shrink">
          <!-- ADMIN LOGIN BUTTON (Placed on left of Home button) -->
          <button id="adminLoginNavBtn" onclick="openDatabaseViewerModal()" title="Sovereign Master Admin Portal" class="nav-tab-btn px-2.5 py-1.5 text-xs font-bold rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-all whitespace-nowrap flex items-center space-x-1.5 shadow-2xs">
            <i class="fa-solid fa-shield-halved text-indigo-600 dark:text-indigo-400 text-xs"></i>
            <span>Admin Login</span>
          </button>"""

new_brand_and_nav = """        <!-- Brand Logo & Admin Button (Admin placed just right of Campus2Career) -->
        <div class="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <div class="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer select-none" onclick="navigateTo('home')">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0B132B] dark:bg-slate-800 flex items-center justify-center text-teal-400 font-extrabold text-lg sm:text-xl shadow-md border border-teal-500/30 shrink-0">
              <i class="fa-solid fa-microchip text-teal-400 text-base sm:text-lg"></i>
            </div>
            <div>
              <div class="flex items-center space-x-1.5">
                <span class="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">Campus<span class="text-[#008080] dark:text-teal-400">2Career</span></span>
                <span class="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-[#008080] dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 uppercase" id="navVersionBadge">v5.5 FOCUS</span>
              </div>
              <p class="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 leading-none hidden lg:block">Personalized Core Skill Competence Engine</p>
            </div>
          </div>

          <!-- ADMIN BUTTON JUST RIGHT OF CAMPUS2CAREER -->
          <button id="adminLoginNavBtn" onclick="openDatabaseViewerModal()" title="Sovereign Master Admin Portal" class="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-all whitespace-nowrap flex items-center space-x-1.5 shadow-2xs cursor-pointer">
            <i class="fa-solid fa-shield-halved text-indigo-600 dark:text-indigo-400 text-xs"></i>
            <span>Admin</span>
          </button>
        </div>

        <!-- Desktop Navigation Items (Learner Mode) -->
        <nav id="navLearnerItems" class="flex items-center space-x-0.5 shrink">"""

if old_brand_and_nav in content:
    content = content.replace(old_brand_and_nav, new_brand_and_nav, 1)
    print("[1] Navbar brand and Admin button updated successfully!")
else:
    print("! Warning: Could not find exact old_brand_and_nav string.")

# -----------------------------------------------------------------------------
# 2. HERO SECTION: Remove Demo button next to View Skill Level, remove Screenshot 4 & 5
# -----------------------------------------------------------------------------
# Search from <!-- Call to Actions --> to <!-- LIVE COMPUTED INTERACTIVE WIDGET -->
hero_cta_pattern = re.compile(r'<!-- Call to Actions -->.*?<!-- Examples of Tailored Core Skill Stacks -->.*?</div>\s*</div>\s*</div>\s*<!-- LIVE COMPUTED INTERACTIVE WIDGET -->', re.DOTALL)

new_hero_cta = """<!-- Call to Actions -->
        <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onclick="startSkillEvaluationWithoutSignup()" class="w-full sm:w-auto px-8 py-3.5 bg-[#008080] hover:bg-[#006666] text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer">
            <i class="fa-solid fa-chart-line mr-1"></i>
            <span>View My Skill Level Diagram &rarr;</span>
          </button>
        </div>
      </div>
    </div>

    <!-- LIVE COMPUTED INTERACTIVE WIDGET -->"""

if hero_cta_pattern.search(content):
    content = hero_cta_pattern.sub(new_hero_cta, content, count=1)
    print("[2] Hero Call to Action, Screenshot 4 and Screenshot 5 elements removed successfully!")
else:
    print("! Warning: hero_cta_pattern not matched.")

# -----------------------------------------------------------------------------
# 3. LECTURE MODAL: Remove "Complete & Level Up (+5%)" button
# -----------------------------------------------------------------------------
old_lecture_footer = """      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span class="text-xs text-slate-500 font-medium">Logged to your verified competence history.</span>
        <div class="flex items-center space-x-2">
          <button onclick="closeResourceModal()" class="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg">Close</button>
          <button onclick="saveAndCompleteResource()" class="px-4 py-2 text-xs font-bold bg-[#008080] text-white hover:bg-[#006666] rounded-lg shadow-sm flex items-center space-x-1.5">
            <i class="fa-solid fa-check mr-1"></i>
            <span>Complete &amp; Level Up (+5%)</span>
          </button>
        </div>
      </div>"""

new_lecture_footer = """      <div class="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span class="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center">
          <i class="fa-solid fa-stopwatch text-teal-600 dark:text-teal-400 mr-1.5"></i>
          <span>Study time and benchmark tests automatically evaluate your competence.</span>
        </span>
        <div class="flex items-center space-x-2">
          <button onclick="closeResourceModal()" class="px-5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-sm cursor-pointer">Close</button>
        </div>
      </div>"""

if old_lecture_footer in content:
    content = content.replace(old_lecture_footer, new_lecture_footer, 1)
    print("[3] Removed 'Complete & Level Up (+5%)' button from lecture modal!")
else:
    print("! Warning: old_lecture_footer not found.")

# Also remove manual "+3% Marathon Bonus" button in marathon cards
old_marathon_button = """              ${isMarathonActive ? `
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center space-x-1">
                  <i class="fa-solid fa-circle-check text-emerald-600"></i>
                  <span>+3% Marathon Revision Bonus Active</span>
                </span>
              ` : `
                <button type="button" onclick="completeMarathonMasterclass('${streamKey}')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center space-x-1">
                  <i class="fa-solid fa-award text-amber-300 text-xs"></i>
                  <span>Mark Completed (+3% Bonus)</span>
                </button>
              `}"""

new_marathon_button = """              <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
                <i class="fa-solid fa-clock text-teal-600 dark:text-teal-400"></i>
                <span>Comprehensive Revision Masterclass</span>
              </span>"""

if old_marathon_button in content:
    content = content.replace(old_marathon_button, new_marathon_button, 1)
    print("[3b] Removed manual 'Mark Completed' bonus from marathon masterclasses!")
else:
    print("! Notice: old_marathon_button not found or previously modified.")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Saved intermediate index.html")
