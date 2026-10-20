with open('index.html', 'rb') as f:
    text = f.read().decode('utf-8')

nl = '\r\n'

t1 = "if (nameField) nameField.classList.add('hidden');" + nl + "        if (usernameField) usernameField.classList.remove('hidden');"
print('t1 (usernameField in signin):', t1 in text)

t3 = "      const name = nameInput ? nameInput.value.trim() : '';" + nl + "      const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';" + nl + "      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';" + nl + "      const pass = passInput ? passInput.value.trim() : '';" + nl + nl + "      if (isSignUp) {" + nl + "        if (!name || !email || !pass) {"
print('t3 (handleAuthSubmit inputs):', t3 in text)

t4 = "          pendingRegistrationUser = {" + nl + "            name: name," + nl + "            email: email," + nl + "            role: role," + nl + "            stream: stream" + nl + "          };"
print('t4 (pendingRegistrationUser):', t4 in text)

t5 = "    function getStarterRadarSkills() {" + nl + "      const studyMins = (appState.user && (Number(appState.user.total_study_minutes) || Number(appState.user.totalStudyMinutes)))"
print('t5 (getStarterRadarSkills):', t5 in text)

t6 = "    async function logStudentActivityToServer(activityType, durationMins, scoreVal, moduleName) {"
print('t6 (logStudentActivityToServer):', t6 in text)

t7 = "        list.push(id);" + nl + "        appState.progress.totalStudyMinutes += 30;" + nl + '        showToast("Great work! Milestone verified and +30m study logged.");'
print('t7 (toggleRoadmapChallenge):', t7 in text)
