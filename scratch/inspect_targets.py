with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

targets = [
    'Your Evaluated Core Skills',
    'Select Additional Skills for Your Discipline',
    'DISCIPLINE-TAILORED COMPETENCE ENGINE',
    'Intermediate (35%)',
    'renderWizardStep',
    'wizardStep',
    'w-skill-checkbox',
    'renderWizardSelectedPills',
    'renderWizardSkillLevelInputs'
]

for t in targets:
    matches = []
    for idx, l in enumerate(lines):
        if t.lower() in l.lower():
            matches.append((idx + 1, l.strip()[:90]))
    print(f"=== Target: {t} ({len(matches)} matches) ===")
    for m in matches[:6]:
        print(f"  L{m[0]}: {m[1]}")
