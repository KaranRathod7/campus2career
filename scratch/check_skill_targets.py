with open('index.html', 'rb') as f:
    text = f.read().decode('utf-8')

nl = '\r\n'

t_radar = "      // 1. If student has active stack, use it with flat 20% baseline if no activity logged" + nl + "      if (Array.isArray(appState.currentStack) && appState.currentStack.length >= 3) {"
print('t_radar:', t_radar in text)

t_diagram = "        const bd = calculateSkillBreakdown(skill);" + nl + "        const tier = getSkillTier(skill.score);" + nl + "        const skillFusion = getFusionColor(skill.score);" + nl + "        const card = document.createElement('div');" + nl + "        const isSkillVerified = (skill.score >= 80);"
print('t_diagram:', t_diagram in text)

t_wizard = "        applyStreamChange(branch, true);" + nl + "        appState.currentStack = chosenStack;" + nl + "        saveStateToStorage();" + nl + "        updateAuthUI();"
print('t_wizard:', t_wizard in text)

t_check_auth = "            updateAuthUI();" + nl + "            renderSkillLevelDiagram();" + nl + "            if (typeof fetchStudentAnalytics === 'function') fetchStudentAnalytics();" + nl + "            return;"
print('t_check_auth:', t_check_auth in text)

t_quiz = "      if (matchingSkill) {" + nl + "        matchingSkill.score = calculateCompositeSkillScore(matchingSkill);" + nl + "      }"
print('t_quiz:', t_quiz in text)

t_close_res = "        if (appState.currentStack) {" + nl + "          appState.currentStack.forEach(s => {" + nl + "            s.score = calculateCompositeSkillScore(s);" + nl + "          });" + nl + "        }"
print('t_close_res:', t_close_res in text)
