# -*- coding: utf-8 -*-
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

checks = [
    # 1. Admin button right of Campus2Career
    ("Admin button near brand", 'Campus<span class="text-[#008080] dark:text-teal-400">2Career</span>' in html and 'id="adminLoginNavBtn"' in html),
    # 2. No "Complete & Level Up" button
    ("No Complete & Level Up button", 'Complete &amp; Level Up' not in html and 'Complete & Level Up' not in html),
    # 3. No Screenshot 4 (Curated Free YouTube Roadmaps in hero)
    ("No Curated Free YouTube in hero", 'Curated Free YouTube Roadmaps' not in html),
    ("No Recruiter Intelligence Portal in hero", 'Recruiter Intelligence Portal &rarr;' not in html),
    # 4. No Screenshot 5 (Examples A, B, C, D)
    ("No Example A: Java Enterprise", 'Example A: Java Enterprise' not in html),
    ("No Example B: Modern Full-Stack", 'Example B: Modern Full-Stack' not in html),
    ("No Example C: AI & Data Ops", 'Example C: AI &amp; Data Ops' not in html and 'Example C: AI & Data Ops' not in html),
    ("No Example D: Cloud / Go Systems", 'Example D: Cloud / Go Systems' not in html),
    # 5. No Demo button next to View My Skill Level Diagram
    ("No Demo button next to View Skill Level", '1-Click Interactive Demo &rarr;' not in html),
    ("View My Skill Level Diagram button exists", 'View My Skill Level Diagram &rarr;' in html),
    # 6. Admin Portal modal & panes exist
    ("databaseViewerModal exists", 'id="databaseViewerModal"' in html),
    ("adminPane-users exists", 'id="adminPane-users"' in html),
    ("adminPane-analytics exists", 'id="adminPane-analytics"' in html),
    ("adminPane-mailbox exists", 'id="adminPane-mailbox"' in html),
    ("adminPane-smtp exists", 'id="adminPane-smtp"' in html),
    ("adminPane-security exists", 'id="adminPane-security"' in html),
    ("databaseUsersTableBody exists", 'id="databaseUsersTableBody"' in html),
    # 7. Admin Auth Modal exists with Quick-Fill helper
    ("adminAuthModal exists", 'id="adminAuthModal"' in html),
    ("quickFillAdminKey exists", 'quickFillAdminKey' in html),
    # 8. Candidates DB file exists
    ("candidates_db.json file created", open("candidates_db.json").read().startswith("[") if open("candidates_db.json") else False),
    # 9. Server has /api/candidates
    ("server.py has /api/candidates", '/api/candidates' in open("server.py", encoding="utf-8").read()),
]

all_passed = True
for name, passed in checks:
    status = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"[{status}] {name}")

print("\nSummary:", "ALL ASSERTIONS PASSED!" if all_passed else "SOME ASSERTIONS FAILED")
if not all_passed:
    exit(1)
