import subprocess

with open('scratch/script5_clean.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Let's find which function or block is unclosed by testing prefixes of lines:
# If a prefix of lines up to line K, when closing all open functions, compiles.
# We can find where the missing brace belongs!

# Let's check lines near where we made edits:
# Edits were made in:
# 1. applyStreamChange
# 2. closeResourceModal / saveAndCompleteResource
# 3. quickFacultyLogin
# 4. syncUsersDBWithServer / admin functions
# 5. verifyAdminPasscode / quickFillAdminKey

# Let's search for function definitions in the last 2000 lines and check each function individually!
funcs = []
for idx, line in enumerate(lines):
    if line.strip().startswith('function ') or line.strip().startswith('async function '):
        funcs.append((idx + 1, line.strip()[:60]))

print(f"Total functions in script: {len(funcs)}")
print("Functions in last 2000 lines:")
for lnum, fdecl in funcs:
    if lnum > len(lines) - 2000:
        print(f"  L{lnum}: {fdecl}")
