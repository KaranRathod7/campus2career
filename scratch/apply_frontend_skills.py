with open('index.html', 'rb') as f:
    raw = f.read().decode('utf-8')

nl = "\r\n"

# 1. Update sendStudentActivity to handle data.skills and add fetchStudentSkills & syncStudentSkills
t1 = (
    "        const res = await fetch('/api/student/activity', {" + nl +
    "          method: 'POST'," + nl +
    "          headers: { 'Content-Type': 'application/json' }," + nl +
    "          credentials: 'include'," + nl +
    "          body: JSON.stringify(payload)" + nl +
    "        });" + nl + nl +
    "        const data = await res.json();" + nl +
    "        if (res.ok && data && data.success) {" + nl +
    "          if (data.readiness_score !== undefined || data.competence !== undefined) {"
)

r1 = (
    "        const res = await fetch('/api/student/activity', {" + nl +
    "          method: 'POST'," + nl +
    "          headers: { 'Content-Type': 'application/json' }," + nl +
    "          credentials: 'include'," + nl +
    "          body: JSON.stringify(payload)" + nl +
    "        });" + nl + nl +
    "        const data = await res.json();" + nl +
    "        if (res.ok && data && data.success) {" + nl +
    "          if (Array.isArray(data.skills) && data.skills.length > 0) {" + nl +
    "            appState.currentStack = data.skills.map(s => ({" + nl +
    "              id: s.skill_id || s.id || (s.skill_name ? s.skill_name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'skill')," + nl +
    "              name: s.skill_name," + nl +
    "              category: s.category || 'Core Skill'," + nl +
    "              score: Number(s.total_score) || Number(s.base_percentage) || 35," + nl +
    "              baseScore: Number(s.base_percentage) || 35," + nl +
    "              status: s.status || (Number(s.total_score) >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')," + nl +
    "              currentMilestone: s.current_milestone || 'Fundamental syntax & baseline concepts'," + nl +
    "              nextMilestone: s.next_milestone || 'Production architecture & high-throughput concurrency'," + nl +
    "              lectures_completed: Number(s.lectures_completed) || 0" + nl +
    "            }));" + nl +
    "            localStorage.setItem(STORAGE_KEY_STACK, JSON.stringify(appState.currentStack));" + nl +
    "            renderSkillLevelDiagram();" + nl +
    "          }" + nl +
    "          if (data.readiness_score !== undefined || data.competence !== undefined) {"
)

assert t1 in raw, "t1 not found"
raw = raw.replace(t1, r1, 1)

# 2. Add fetchStudentSkills and syncStudentSkills right below fetchStudentAnalytics
t2 = (
    "          if (typeof renderRadarCompetenceDiagram === 'function') {" + nl +
    "            renderRadarCompetenceDiagram();" + nl +
    "          }" + nl +
    "          return data;" + nl +
    "        }" + nl +
    "      } catch (err) {" + nl +
    "        console.warn('[Fetch Student Analytics Warning]', err);" + nl +
    "      }" + nl +
    "    }"
)

r2 = (
    "          if (typeof renderRadarCompetenceDiagram === 'function') {" + nl +
    "            renderRadarCompetenceDiagram();" + nl +
    "          }" + nl +
    "          return data;" + nl +
    "        }" + nl +
    "      } catch (err) {" + nl +
    "        console.warn('[Fetch Student Analytics Warning]', err);" + nl +
    "      }" + nl +
    "    }" + nl + nl +
    "    async function fetchStudentSkills() {" + nl +
    "      try {" + nl +
    "        const userEmail = (appState.user && appState.user.email) ? encodeURIComponent(appState.user.email) : '';" + nl +
    "        const userId = (appState.user && appState.user.id) ? encodeURIComponent(appState.user.id) : '';" + nl +
    "        let url = '/api/student/skills';" + nl +
    "        if (userEmail) url += `?user_email=${userEmail}`;" + nl +
    "        if (userId) url += `${userEmail ? '&' : '?'}user_id=${userId}`;" + nl + nl +
    "        const res = await fetch(url, {" + nl +
    "          method: 'GET'," + nl +
    "          credentials: 'include'" + nl +
    "        });" + nl +
    "        const data = await res.json();" + nl +
    "        if (res.ok && data && data.success && Array.isArray(data.skills) && data.skills.length > 0) {" + nl +
    "          appState.currentStack = data.skills.map(s => ({" + nl +
    "            id: s.skill_id || s.id || (s.skill_name ? s.skill_name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'skill')," + nl +
    "            name: s.skill_name," + nl +
    "            category: s.category || 'Core Skill'," + nl +
    "            score: Number(s.total_score) || Number(s.base_percentage) || 35," + nl +
    "            baseScore: Number(s.base_percentage) || 35," + nl +
    "            status: s.status || (Number(s.total_score) >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')," + nl +
    "            currentMilestone: s.current_milestone || 'Fundamental syntax & baseline concepts'," + nl +
    "            nextMilestone: s.next_milestone || 'Production architecture & high-throughput concurrency'," + nl +
    "            lectures_completed: Number(s.lectures_completed) || 0" + nl +
    "          }));" + nl +
    "          localStorage.setItem(STORAGE_KEY_STACK, JSON.stringify(appState.currentStack));" + nl +
    "          renderSkillLevelDiagram();" + nl +
    "          if (typeof renderRadarCompetenceDiagram === 'function') {" + nl +
    "            renderRadarCompetenceDiagram();" + nl +
    "          }" + nl +
    "          return data.skills;" + nl +
    "        }" + nl +
    "      } catch (err) {" + nl +
    "        console.warn('[Fetch Student Skills Warning]', err);" + nl +
    "      }" + nl +
    "      return null;" + nl +
    "    }" + nl + nl +
    "    async function syncStudentSkills(skillsToSync) {" + nl +
    "      try {" + nl +
    "        const stack = skillsToSync || appState.currentStack;" + nl +
    "        if (!Array.isArray(stack) || stack.length === 0) return;" + nl + nl +
    "        const userEmail = (appState.user && appState.user.email) ? appState.user.email : null;" + nl +
    "        const userId = (appState.user && appState.user.id) ? appState.user.id : null;" + nl +
    "        const stream = (appState.user && (appState.user.stream || appState.user.branch)) || appState.selectedStream || 'it';" + nl + nl +
    "        const payload = {" + nl +
    "          stream," + nl +
    "          user_id: userId," + nl +
    "          user_email: userEmail," + nl +
    "          skills: stack.map(s => ({" + nl +
    "            skill_id: s.id || (s.name ? s.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'skill')," + nl +
    "            skill_name: s.name," + nl +
    "            category: s.category || 'Core Skill'," + nl +
    "            base_percentage: s.baseScore !== undefined ? s.baseScore : (s.score || 35)," + nl +
    "            total_score: s.score || 35," + nl +
    "            status: s.status || (s.score >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')," + nl +
    "            current_milestone: s.currentMilestone || 'Fundamental syntax & baseline concepts'," + nl +
    "            next_milestone: s.nextMilestone || 'Production architecture & high-throughput concurrency'," + nl +
    "            lectures_completed: s.lectures_completed || 0" + nl +
    "          }))" + nl +
    "        };" + nl + nl +
    "        const res = await fetch('/api/student/skills/sync', {" + nl +
    "          method: 'POST'," + nl +
    "          headers: { 'Content-Type': 'application/json' }," + nl +
    "          credentials: 'include'," + nl +
    "          body: JSON.stringify(payload)" + nl +
    "        });" + nl + nl +
    "        const data = await res.json();" + nl +
    "        return data;" + nl +
    "      } catch (err) {" + nl +
    "        console.warn('[Sync Student Skills Warning]', err);" + nl +
    "      }" + nl +
    "    }"
)

assert t2 in raw, "t2 not found"
raw = raw.replace(t2, r2, 1)

# 3. getStarterRadarSkills: render real evaluated scores from active stack
t3 = (
    "      // 1. If student has active stack, use it with flat 20% baseline if no activity logged" + nl +
    "      if (Array.isArray(appState.currentStack) && appState.currentStack.length >= 3) {" + nl +
    "        return appState.currentStack.map(s => ({" + nl +
    "          name: s.name || s.id || 'Skill'," + nl +
    "          score: hasActivity && Number.isFinite(Number(s.score)) ? Math.max(10, Math.min(100, Number(s.score))) : 20," + nl +
    "          category: s.category || 'Discipline'" + nl +
    "        }));" + nl +
    "      }"
)

r3 = (
    "      // 1. If student has active stack from DB or onboarding, use real evaluated scores" + nl +
    "      if (Array.isArray(appState.currentStack) && appState.currentStack.length >= 3) {" + nl +
    "        return appState.currentStack.map(s => ({" + nl +
    "          name: s.name || s.id || 'Skill'," + nl +
    "          score: Number.isFinite(Number(s.score)) ? Math.max(10, Math.min(100, Number(s.score))) : 35," + nl +
    "          category: s.category || 'Discipline'," + nl +
    "          verified: Boolean(s.status === 'LIVE VERIFIED' || s.score >= 80 || s.verified)" + nl +
    "        }));" + nl +
    "      }"
)

assert t3 in raw, "t3 not found"
raw = raw.replace(t3, r3, 1)

# 4. renderSkillLevelDiagram: status badge checking
t4 = (
    "        const bd = calculateSkillBreakdown(skill);" + nl +
    "        const tier = getSkillTier(skill.score);" + nl +
    "        const skillFusion = getFusionColor(skill.score);" + nl +
    "        const card = document.createElement('div');" + nl +
    "        const isSkillVerified = (skill.score >= 80);"
)

r4 = (
    "        const bd = calculateSkillBreakdown(skill);" + nl +
    "        const tier = getSkillTier(skill.score);" + nl +
    "        const skillFusion = getFusionColor(skill.score);" + nl +
    "        const card = document.createElement('div');" + nl +
    "        const isSkillVerified = (skill.score >= 80) || skill.status === 'LIVE VERIFIED' || Boolean(skill.verified);"
)

assert t4 in raw, "t4 not found"
raw = raw.replace(t4, r4, 1)

t4_badge = (
    "                ${isSkillVerified ? `" + nl +
    "                  <span class=\"text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800\">" + nl +
    "                    <i class=\"fa-solid fa-circle-check mr-1\"></i> VERIFIED READY" + nl +
    "                  </span>" + nl +
    "                ` : `" + nl +
    "                  <span class=\"text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800\">" + nl +
    "                    <i class=\"fa-solid fa-clock mr-1\"></i> UNVERIFIED BASELINE (${skill.score}%)" + nl +
    "                  </span>" + nl +
    "                `}"
)

r4_badge = (
    "                ${isSkillVerified ? `" + nl +
    "                  <span class=\"text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800\">" + nl +
    "                    <i class=\"fa-solid fa-circle-check mr-1\"></i> LIVE VERIFIED (${skill.score}%)" + nl +
    "                  </span>" + nl +
    "                ` : `" + nl +
    "                  <span class=\"text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800\">" + nl +
    "                    <i class=\"fa-solid fa-clock mr-1\"></i> ${skill.status || `UNVERIFIED BASELINE (${skill.score}%)`}" + nl +
    "                  </span>" + nl +
    "                `}"
)

assert t4_badge in raw, "t4_badge not found"
raw = raw.replace(t4_badge, r4_badge, 1)

# 5. nextWizardStep: syncStudentSkills on Step 4 finish
t5 = (
    "        applyStreamChange(branch, true);" + nl +
    "        appState.currentStack = chosenStack;" + nl +
    "        saveStateToStorage();" + nl +
    "        updateAuthUI();" + nl + nl +
    "        renderSkillLevelDiagram();"
)

r5 = (
    "        applyStreamChange(branch, true);" + nl +
    "        appState.currentStack = chosenStack;" + nl +
    "        saveStateToStorage();" + nl +
    "        updateAuthUI();" + nl + nl +
    "        if (typeof syncStudentSkills === 'function') {" + nl +
    "          syncStudentSkills(chosenStack);" + nl +
    "        }" + nl + nl +
    "        renderSkillLevelDiagram();"
)

assert t5 in raw, "t5 not found"
raw = raw.replace(t5, r5, 1)

# 6. submitQuiz: syncStudentSkills on quiz completion
t6 = (
    "      if (matchingSkill) {" + nl +
    "        matchingSkill.score = calculateCompositeSkillScore(matchingSkill);" + nl +
    "      }"
)

r6 = (
    "      if (matchingSkill) {" + nl +
    "        matchingSkill.score = calculateCompositeSkillScore(matchingSkill);" + nl +
    "        if (percentage >= 80 || matchingSkill.score >= 80) {" + nl +
    "          matchingSkill.status = 'LIVE VERIFIED';" + nl +
    "        }" + nl +
    "        if (typeof syncStudentSkills === 'function') {" + nl +
    "          syncStudentSkills(appState.currentStack);" + nl +
    "        }" + nl +
    "      }"
)

assert t6 in raw, "t6 not found"
raw = raw.replace(t6, r6, 1)

# 7. closeResourceModal: syncStudentSkills on video completion
t7 = (
    "        if (appState.currentStack) {" + nl +
    "          appState.currentStack.forEach(s => {" + nl +
    "            s.score = calculateCompositeSkillScore(s);" + nl +
    "          });" + nl +
    "        }"
)

r7 = (
    "        if (appState.currentStack) {" + nl +
    "          appState.currentStack.forEach(s => {" + nl +
    "            s.score = calculateCompositeSkillScore(s);" + nl +
    "            if (s.score >= 80) s.status = 'LIVE VERIFIED';" + nl +
    "          });" + nl +
    "          if (typeof syncStudentSkills === 'function') {" + nl +
    "            syncStudentSkills(appState.currentStack);" + nl +
    "          }" + nl +
    "        }"
)

assert t7 in raw, "t7 not found"
raw = raw.replace(t7, r7, 1)

# 8. checkAuthSession: fetchStudentSkills on active session
t8 = (
    "            updateAuthUI();" + nl +
    "            renderSkillLevelDiagram();" + nl +
    "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl +
    "            return;"
)

r8 = (
    "            updateAuthUI();" + nl +
    "            if (typeof fetchStudentSkills === 'function') await fetchStudentSkills();" + nl +
    "            renderSkillLevelDiagram();" + nl +
    "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl +
    "            return;"
)

assert t8 in raw, "t8 not found"
raw = raw.replace(t8, r8, 1)

# 9. Login success: fetchStudentSkills
t9 = (
    "            renderSkillLevelDiagram();" + nl +
    "            updateGrowthSummaryCards();" + nl +
    "            updateCharts();" + nl +
    "            showToast(`Welcome back, ${foundUser.name}!`);"
)

r9 = (
    "            if (typeof fetchStudentSkills === 'function') fetchStudentSkills();" + nl +
    "            renderSkillLevelDiagram();" + nl +
    "            updateGrowthSummaryCards();" + nl +
    "            updateCharts();" + nl +
    "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl +
    "            showToast(`Welcome back, ${foundUser.name}!`);"
)

assert t9 in raw, "t9 not found"
raw = raw.replace(t9, r9, 1)

# 10. verifyPin and cross-device: fetchStudentSkills
t10 = (
    "        updateAuthUI();" + nl +
    "        closeAuthModal();" + nl +
    "        if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();"
)

r10 = (
    "        updateAuthUI();" + nl +
    "        closeAuthModal();" + nl +
    "        if (typeof fetchStudentSkills === 'function') fetchStudentSkills();" + nl +
    "        if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();"
)

assert t10 in raw, "t10 not found"
raw = raw.replace(t10, r10, 1)

t11 = (
    "              renderSkillLevelDiagram();" + nl +
    "              updateGrowthSummaryCards();" + nl +
    "              updateCharts();" + nl +
    "            }"
)

r11 = (
    "              renderSkillLevelDiagram();" + nl +
    "              updateGrowthSummaryCards();" + nl +
    "              updateCharts();" + nl +
    "              if (typeof fetchStudentSkills === 'function') fetchStudentSkills();" + nl +
    "              if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl +
    "            }"
)

assert t11 in raw, "t11 not found"
raw = raw.replace(t11, r11, 1)

with open('index.html', 'wb') as f:
    f.write(raw.encode('utf-8'))

print("All frontend skill sync & hydration modifications applied successfully to index.html!")
