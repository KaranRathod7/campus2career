import subprocess
import os

with open('scratch/script5_clean.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# We know node -c gives 'Unexpected end of input'.
# That means there is an unclosed brace { somewhere in the file.
# If we append '}' (or '});' etc.) to the end of the file, let's see how many braces are missing!
for count in range(1, 10):
    test_code = ''.join(lines) + '\n' + ('}' * count)
    with open('scratch/test_try.js', 'w', encoding='utf-8') as f:
        f.write(test_code)
    p = subprocess.run(['node', '-c', 'scratch/test_try.js'], capture_output=True, text=True)
    print(f"Adding {count} closing braces -> exit code {p.returncode}")
    if p.returncode == 0:
        print(f"SUCCESS with {count} closing braces!")
        break
    else:
        err = p.stderr.strip().split('\n')[0]
        print(f"   Error: {err}")
