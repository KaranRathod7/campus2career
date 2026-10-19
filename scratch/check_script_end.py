with open('scratch/script5_clean.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in script5_clean: {len(lines)}")

# Check last 100 lines of script5_clean
for i in range(max(0, len(lines) - 80), len(lines)):
    print(f"L{i+1}: {lines[i].rstrip()}")
