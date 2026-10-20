import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Viewport tag
viewport_match = re.search(r'<meta\s+name=["\']viewport["\'][^>]*>', content, re.IGNORECASE)
print("Current viewport tag:", viewport_match.group(0) if viewport_match else "None")

# 2. Fixed widths > 360px
lines = content.splitlines()
fixed_matches = []
for idx, l in enumerate(lines):
    # CSS style="width: 1200px" or min-width: ...
    m = re.findall(r'(?:width|min-width)\s*:\s*(\d+)px', l, re.IGNORECASE)
    for val in m:
        if int(val) > 360:
            fixed_matches.append((idx + 1, f"style: {val}px", l.strip()[:100]))
    # Tailwind w-[1200px] or min-w-[...]
    tw = re.findall(r'(?:min-w|w)-\[(\d+)px\]', l)
    for val in tw:
        if int(val) > 360:
            fixed_matches.append((idx + 1, f"tailwind: {val}px", l.strip()[:100]))

print(f"\nFixed width matches > 360px (found {len(fixed_matches)}):")
for f in fixed_matches:
    print(f"Line {f[0]}: {f[1]} -> {f[2]}")
