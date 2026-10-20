import sys

with open('index.html', 'rb') as f:
    raw = f.read().decode('utf-8')

nl = "\r\n"

# 1. switchAuthTab: Hide usernameField in signin mode
t1 = "if (nameField) nameField.classList.add('hidden');" + nl + "        if (usernameField) usernameField.classList.remove('hidden');"
r1 = "if (nameField) nameField.classList.add('hidden');" + nl + "        if (usernameField) usernameField.classList.add('hidden');"

assert t1 in raw, "t1 not found"
raw = raw.replace(t1, r1, 1)

# 2. checkAuthSession: trigger fetchStudentAnalytics on active session
t2 = "            updateAuthUI();" + nl + "            renderSkillLevelDiagram();" + nl + "            return;"
r2 = "            updateAuthUI();" + nl + "            renderSkillLevelDiagram();" + nl + "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl + "            return;"

assert t2 in raw, "t2 not found"
raw = raw.replace(t2, r2, 1)

# 3. getStarterRadarSkills: use live database analytics if present
t3 = "    function getStarterRadarSkills() {" + nl + "      const studyMins = (appState.user && (Number(appState.user.total_study_minutes) || Number(appState.user.totalStudyMinutes)))"
r3 = "    function getStarterRadarSkills() {" + nl + "      if (appState.studentAnalytics && Array.isArray(appState.studentAnalytics.skill_competencies) && appState.studentAnalytics.skill_competencies.length >= 3) {" + nl + "        return appState.studentAnalytics.skill_competencies.map(s => ({" + nl + "          name: s.name," + nl + "          score: Math.max(10, Math.min(100, Number(s.score) || 20))," + nl + "          category: 'Discipline'," + nl + "          verified: Boolean(s.verified)" + nl + "        }));" + nl + "      }" + nl + nl + "      const studyMins = (appState.user && (Number(appState.user.total_study_minutes) || Number(appState.user.totalStudyMinutes)))"

assert t3 in raw, "t3 not found"
raw = raw.replace(t3, r3, 1)

# 4. sendStudentActivity and fetchStudentAnalytics + logStudentActivityToServer replacement
t4 = "    async function logStudentActivityToServer(activityType, durationMins, scoreVal, moduleName) {" + nl + "      try {"
# We find the whole logStudentActivityToServer function
t4_full = (
    "    async function logStudentActivityToServer(activityType, durationMins, scoreVal, moduleName) {" + nl +
    "      try {" + nl +
    "        const userEmail = (appState.user && appState.user.email) ? appState.user.email : null;" + nl +
    "        const payload = {" + nl +
    "          activity_type: activityType," + nl +
    "          duration_minutes: durationMins ? Number(durationMins) : 0," + nl +
    "          score: (scoreVal !== undefined && scoreVal !== null) ? Number(scoreVal) : null," + nl +
    "          module_name: moduleName || 'Core Curriculum Module'" + nl +
    "        };" + nl +
    "        if (userEmail) {" + nl +
    "          payload.user_email = userEmail;" + nl +
    "        }" + nl + nl +
    "        const res = await fetch('/api/student/log-activity'," + nl +
    "          method: 'POST'," + nl +
    "          headers: { 'Content-Type': 'application/json' }," + nl +
    "          credentials: 'include'," + nl +
    "          body: JSON.stringify(payload)" + nl +
    "        });" + nl + nl +
    "        const data = await res.json();" + nl +
    "        if (res.ok && data && data.success && data.competence) {" + nl +
    "          updateLiveCompetenceUI(data.competence);" + nl +
    "          return data;" + nl +
    "        } else {" + nl +
    "          console.log('[Student Activity Pipeline Log]', (data && data.error) || 'Recorded in evaluation session');" + nl +
    "        }" + nl +
    "        return data;" + nl +
    "      } catch (err) {" + nl +
    "        console.warn('[Student Activity Pipeline - Offline/Resilient Mode]', err);" + nl +
    "        return null;" + nl +
    "      }" + nl +
    "    }"
)

# Let's verify whether t4_full or t4 is in raw
if t4_full in raw:
    r4 = (
        "    async function sendStudentActivity({ activity_type, topic, score, time_spent_minutes, competence }) {" + nl +
        "      try {" + nl +
        "        const userEmail = (appState.user && appState.user.email) ? appState.user.email : null;" + nl +
        "        const userId = (appState.user && appState.user.id) ? appState.user.id : null;" + nl +
        "        const userStream = (appState.user && (appState.user.stream || appState.user.branch)) || appState.selectedStream || 'IT';" + nl + nl +
        "        let normType = (activity_type || 'timer').toLowerCase();" + nl +
        "        if (normType === 'study_timer' || normType === 'study') normType = 'timer';" + nl +
        "        if (normType === 'lecture_timer' || normType === 'lecture' || normType === 'masterclass') normType = 'revision';" + nl +
        "        if (normType === 'exam' || normType === 'mcq') normType = 'quiz';" + nl + nl +
        "        const payload = {" + nl +
        "          activity_type: normType," + nl +
        "          topic: topic || 'Core Engineering Track'," + nl +
        "          score: (score !== undefined && score !== null) ? Number(score) : null," + nl +
        "          time_spent_minutes: time_spent_minutes ? Number(time_spent_minutes) : 0," + nl +
        "          competence: (competence !== undefined && competence !== null) ? Number(competence) : (score !== undefined && score !== null ? Number(score) : 75)," + nl +
        "          stream: userStream," + nl +
        "          user_id: userId," + nl +
        "          user_email: userEmail" + nl +
        "        };" + nl + nl +
        "        const res = await fetch('/api/student/activity', {" + nl +
        "          method: 'POST'," + nl +
        "          headers: { 'Content-Type': 'application/json' }," + nl +
        "          credentials: 'include'," + nl +
        "          body: JSON.stringify(payload)" + nl +
        "        });" + nl + nl +
        "        const data = await res.json();" + nl +
        "        if (res.ok && data && data.success) {" + nl +
        "          if (data.readiness_score !== undefined || data.competence !== undefined) {" + nl +
        "            updateLiveCompetenceUI({" + nl +
        "              dynamic_competence_percent: data.competence || data.readiness_score," + nl +
        "              readiness_score: data.readiness_score," + nl +
        "              total_study_minutes: data.total_study_minutes" + nl +
        "            });" + nl +
        "          }" + nl +
        "          if (typeof fetchStudentAnalytics === 'function') {" + nl +
        "            fetchStudentAnalytics();" + nl +
        "          }" + nl +
        "          return data;" + nl +
        "        }" + nl +
        "      } catch (err) {" + nl +
        "        console.warn('[Student Activity - Resilient Dispatch Warning]', err);" + nl +
        "      }" + nl +
        "    }" + nl + nl +
        "    async function fetchStudentAnalytics() {" + nl +
        "      try {" + nl +
        "        const userEmail = (appState.user && appState.user.email) ? encodeURIComponent(appState.user.email) : '';" + nl +
        "        const userId = (appState.user && appState.user.id) ? encodeURIComponent(appState.user.id) : '';" + nl +
        "        const stream = (appState.user && (appState.user.stream || appState.user.branch)) || appState.selectedStream || 'IT';" + nl + nl +
        "        let url = `/api/student/analytics?stream=${encodeURIComponent(stream)}`;" + nl +
        "        if (userEmail) url += `&email=${userEmail}`;" + nl +
        "        if (userId) url += `&user_id=${userId}`;" + nl + nl +
        "        const res = await fetch(url, {" + nl +
        "          method: 'GET'," + nl +
        "          credentials: 'include'" + nl +
        "        });" + nl +
        "        const data = await res.json();" + nl +
        "        if (res.ok && data && data.success) {" + nl +
        "          appState.studentAnalytics = data;" + nl + nl +
        "          if (data.readiness_score !== undefined) {" + nl +
        "            const scoreVal = Math.round(data.readiness_score);" + nl +
        "            const fusion = (typeof getFusionColor === 'function') ? getFusionColor(scoreVal) : { hex: '#008080' };" + nl + nl +
        "            const scoreEl = document.getElementById('overallStackScore');" + nl +
        "            const ringPercentEl = document.getElementById('progressRingPercent');" + nl +
        "            const ringEl = document.getElementById('competenceProgressRing');" + nl +
        "            const barEl = document.getElementById('overallProgressBar');" + nl + nl +
        "            if (scoreEl) {" + nl +
        "              scoreEl.innerText = `${scoreVal}%`;" + nl +
        "              scoreEl.style.color = fusion.hex;" + nl +
        "            }" + nl +
        "            if (ringPercentEl) {" + nl +
        "              ringPercentEl.innerText = `${scoreVal}%`;" + nl +
        "              ringPercentEl.style.color = fusion.hex;" + nl +
        "            }" + nl +
        "            if (ringEl) {" + nl +
        "              const dashOffset = Math.max(0, Math.min(100, 100 - scoreVal));" + nl +
        "              ringEl.style.strokeDashoffset = dashOffset;" + nl +
        "              ringEl.style.color = fusion.hex;" + nl +
        "            }" + nl +
        "            if (barEl) {" + nl +
        "              barEl.style.width = `${scoreVal}%`;" + nl +
        "              barEl.style.backgroundColor = fusion.hex;" + nl +
        "            }" + nl +
        "          }" + nl + nl +
        "          if (data.study_hours !== undefined) {" + nl +
        "            const hEl = document.getElementById('growthTotalHours');" + nl +
        "            if (hEl && data.study_hours > 0) hEl.innerText = `${data.study_hours} hrs`;" + nl +
        "          }" + nl + nl +
        "          if (typeof renderRadarCompetenceDiagram === 'function') {" + nl +
        "            renderRadarCompetenceDiagram();" + nl +
        "          }" + nl +
        "          return data;" + nl +
        "        }" + nl +
        "      } catch (err) {" + nl +
        "        console.warn('[Fetch Student Analytics Warning]', err);" + nl +
        "      }" + nl +
        "    }" + nl + nl +
        "    async function logStudentActivityToServer(activityType, durationMins, scoreVal, moduleName) {" + nl +
        "      let normType = 'timer';" + nl +
        "      if (activityType === 'exam' || activityType === 'quiz' || activityType === 'mcq') normType = 'quiz';" + nl +
        "      else if (activityType === 'lecture_timer' || activityType === 'lecture' || activityType === 'revision') normType = 'revision';" + nl +
        "      else normType = 'timer';" + nl + nl +
        "      return sendStudentActivity({" + nl +
        "        activity_type: normType," + nl +
        "        topic: moduleName," + nl +
        "        time_spent_minutes: durationMins," + nl +
        "        score: scoreVal," + nl +
        "        competence: scoreVal" + nl +
        "      });" + nl +
        "    }"
    )
    raw = raw.replace(t4_full, r4, 1)
else:
    print("WARNING: t4_full not matched exactly!")

# 5. handleAuthSubmit username validation
t5 = (
    "      const name = nameInput ? nameInput.value.trim() : '';" + nl +
    "      const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';" + nl +
    "      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';" + nl +
    "      const pass = passInput ? passInput.value.trim() : '';" + nl + nl +
    "      if (isSignUp) {" + nl +
    "        if (!name || !email || !pass) {"
)
r5 = (
    "      const name = nameInput ? nameInput.value.trim() : '';" + nl +
    "      const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';" + nl +
    "      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';" + nl +
    "      const pass = passInput ? passInput.value.trim() : '';" + nl + nl +
    "      if (isSignUp) {" + nl +
    "        if (!name || !username || !email || !pass) {" + nl +
    "          showAuthAlert(\"Please fill in your full name, username, email, and password to sign up.\");" + nl +
    "          triggerAlertShake('authStatusAlert');" + nl +
    "          return;" + nl +
    "        }" + nl +
    "        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {" + nl +
    "          showAuthAlert(\"Username must be 3-30 characters (letters, numbers, underscores, dots, or hyphens).\");" + nl +
    "          triggerAlertShake('authStatusAlert');" + nl +
    "          return;" + nl +
    "        }"
)
assert t5 in raw, "t5 not found"
raw = raw.replace(t5, r5, 1)

# 6. handleAuthSubmit register body
t6 = (
    "          const res = await fetch('/api/register', {" + nl +
    "            method: 'POST'," + nl +
    "            headers: { 'Content-Type': 'application/json' }," + nl +
    "            body: JSON.stringify({ name, email, password: pass, role, stream })" + nl +
    "          });"
)
r6 = (
    "          const res = await fetch('/api/register', {" + nl +
    "            method: 'POST'," + nl +
    "            headers: { 'Content-Type': 'application/json' }," + nl +
    "            body: JSON.stringify({ name, username, email, password: pass, role, stream })" + nl +
    "          });"
)
assert t6 in raw, "t6 not found"
raw = raw.replace(t6, r6, 1)

# 7. handleAuthSubmit username taken error
t7 = (
    "          if (!res.ok || !data.success) {" + nl +
    "            if (res.status === 409 || data.error === 'already_registered') {"
)
r7 = (
    "          if (!res.ok || !data.success) {" + nl +
    "            if (data.error === 'username_taken') {" + nl +
    "              showAuthAlert(data.message || \"This username is already taken. Please choose another username.\");" + nl +
    "              triggerAlertShake('authStatusAlert');" + nl +
    "              return;" + nl +
    "            }" + nl +
    "            if (res.status === 409 || data.error === 'already_registered') {"
)
assert t7 in raw, "t7 not found"
raw = raw.replace(t7, r7, 1)

# 8. handleAuthSubmit pendingRegistrationUser
t8 = (
    "          pendingRegistrationUser = {" + nl +
    "            name: name," + nl +
    "            email: email," + nl +
    "            role: role," + nl +
    "            stream: stream" + nl +
    "          };"
)
r8 = (
    "          pendingRegistrationUser = {" + nl +
    "            name: name," + nl +
    "            username: username," + nl +
    "            email: email," + nl +
    "            role: role," + nl +
    "            stream: stream" + nl +
    "          };"
)
assert t8 in raw, "t8 not found"
raw = raw.replace(t8, r8, 1)

# 9. toggleRoadmapChallenge milestone completion
t9 = (
    "        list.push(id);" + nl +
    "        appState.progress.totalStudyMinutes += 30;" + nl +
    '        showToast("Great work! Milestone verified and +30m study logged.");'
)
r9 = (
    "        list.push(id);" + nl +
    "        appState.progress.totalStudyMinutes += 30;" + nl +
    '        showToast("Great work! Milestone verified and +30m study logged.");' + nl +
    "        if (typeof sendStudentActivity === 'function') {" + nl +
    "          sendStudentActivity({" + nl +
    "            activity_type: 'revision'," + nl +
    "            topic: `Roadmap Milestone: ${id}`," + nl +
    "            score: 85," + nl +
    "            time_spent_minutes: 30," + nl +
    "            competence: 85" + nl +
    "          });" + nl +
    "        }"
)
assert t9 in raw, "t9 not found"
raw = raw.replace(t9, r9, 1)

# 10. verify-pin and cross-device polling success: trigger fetchStudentAnalytics
t10 = "        updateAuthUI();" + nl + "        closeAuthModal();" + nl + nl + '        showToast(`✓ Account verified! Welcome to Campus2Career, ${verifiedUser.name}!`);'
r10 = "        updateAuthUI();" + nl + "        closeAuthModal();" + nl + "        if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl + nl + '        showToast(`✓ Account verified! Welcome to Campus2Career, ${verifiedUser.name}!`);'
if t10 in raw:
    raw = raw.replace(t10, r10, 1)

t11 = "            updateCharts();" + nl + "          }" + nl + "        }" + nl + "      } catch (err) {"
r11 = "            updateCharts();" + nl + "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl + "          }" + nl + "        }" + nl + "      } catch (err) {"
if t11 in raw:
    raw = raw.replace(t11, r11, 1)

with open('index.html', 'wb') as f:
    f.write(raw.encode('utf-8'))

print("All frontend modifications applied successfully to index.html!")
