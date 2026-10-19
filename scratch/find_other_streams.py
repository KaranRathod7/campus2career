with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if any(line.strip().startswith(k) for k in ['mech: {', 'civil: {', 'ee: {', 'chem: {']):
        print(f"L{idx+1}: {line.strip()[:80]}")
