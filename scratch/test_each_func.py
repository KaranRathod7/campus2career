import subprocess

with open('scratch/script5_clean.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

funcs = []
for idx, line in enumerate(lines):
    if line.strip().startswith('function ') or line.strip().startswith('async function '):
        funcs.append(idx)

funcs.append(len(lines))

for i in range(len(funcs) - 1):
    start = funcs[i]
    end = funcs[i+1]
    fcode = ''.join(lines[start:end])
    with open('scratch/test_func.js', 'w', encoding='utf-8') as tf:
        tf.write(fcode)
    p = subprocess.run(['node', '-c', 'scratch/test_func.js'], capture_output=True, text=True)
    if p.returncode != 0:
        print(f"Error in function starting at L{start+1}: {lines[start].strip()[:50]}")
        print("  Error:", p.stderr.strip().split('\n')[0])
