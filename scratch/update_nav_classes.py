import sys

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace navLearnerItems opening tag
old_learner = '<nav id="navLearnerItems" class="flex items-center space-x-1 min-w-0">'
new_learner = '<nav id="navLearnerItems" class="hidden md:flex items-center space-x-1 min-w-0">'

if old_learner in content:
    content = content.replace(old_learner, new_learner, 1)
    print("navLearnerItems updated.")
else:
    print("navLearnerItems target not found.")

# Replace navRecruiterItems opening tag
old_recruiter = '<nav id="navRecruiterItems" class="hidden items-center space-x-1 shrink-0">'
new_recruiter = '<nav id="navRecruiterItems" class="hidden md:flex items-center space-x-1 shrink-0" style="display: none;">'

if old_recruiter in content:
    content = content.replace(old_recruiter, new_recruiter, 1)
    print("navRecruiterItems updated.")
else:
    print("navRecruiterItems target not found.")

# Update setRole to manage style.display
setrole_target = """      if (role === 'recruiter') {
        if (learnerNav) { learnerNav.classList.add('hidden'); learnerNav.classList.remove('flex', 'xl:flex'); }
        if (recruiterNav) { recruiterNav.classList.remove('hidden'); recruiterNav.classList.add('flex'); }"""

setrole_replacement = """      if (role === 'recruiter') {
        if (learnerNav) { learnerNav.style.display = 'none'; learnerNav.classList.add('hidden'); learnerNav.classList.remove('flex', 'xl:flex'); }
        if (recruiterNav) { recruiterNav.style.display = ''; recruiterNav.classList.remove('hidden'); recruiterNav.classList.add('flex'); }"""

if setrole_target in content:
    content = content.replace(setrole_target, setrole_replacement, 1)
    print("setRole recruiter style.display updated.")

setrole_target_else = """      } else {
        if (learnerNav) { learnerNav.classList.remove('hidden'); learnerNav.classList.add('flex'); }
        if (recruiterNav) { recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('flex', 'xl:flex'); }"""

setrole_replacement_else = """      } else {
        if (learnerNav) { learnerNav.style.display = ''; learnerNav.classList.remove('hidden'); learnerNav.classList.add('flex'); }
        if (recruiterNav) { recruiterNav.style.display = 'none'; recruiterNav.classList.add('hidden'); recruiterNav.classList.remove('flex', 'xl:flex'); }"""

if setrole_target_else in content:
    content = content.replace(setrole_target_else, setrole_replacement_else, 1)
    print("setRole learner style.display updated.")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("index.html written successfully.")
