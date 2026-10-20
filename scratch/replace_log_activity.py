with open('index.html', 'rb') as f:
    raw = f.read().decode('utf-8')

nl = "\r\n"

# Let's inspect the lines around 26085-26125
start_marker = "    /* ========================================================================= */" + nl + "    /* STUDENT ACTIVITY PIPELINE & DYNAMIC COMPETENCE TRACKING                   */" + nl + "    /* ========================================================================= */" + nl + "    async function logStudentActivityToServer(activityType, durationMins, scoreVal, moduleName) {"
end_marker = "      } catch (err) {" + nl + "        console.warn('[Student Activity Pipeline - Offline/Resilient Mode]', err);" + nl + "        return null;" + nl + "      }" + nl + "    }"

print("start_marker in raw:", start_marker in raw)
print("end_marker in raw:", end_marker in raw)

pos1 = raw.find(start_marker)
pos2 = raw.find(end_marker)
if pos1 != -1 and pos2 != -1:
    old_block = raw[pos1:pos2 + len(end_marker)]
    new_block = (
        "    /* ========================================================================= */" + nl +
        "    /* STUDENT ACTIVITY PIPELINE & DYNAMIC COMPETENCE TRACKING                   */" + nl +
        "    /* ========================================================================= */" + nl +
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
    raw = raw[:pos1] + new_block + raw[pos2 + len(end_marker):]
    with open('index.html', 'wb') as f:
        f.write(raw.encode('utf-8'))
    print("Replaced successfully!")
else:
    print("Could not find start/end markers")
