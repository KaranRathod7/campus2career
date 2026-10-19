with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
streams = re.findall(r'(\w+):\s*\{\s*name:\s*[\'"][^\'"]+[\'"]', text[:30000])
print("Streams found in STREAM_DATA:")
for s in streams:
    print(" -", s)

# Let's inspect all keys under STREAM_DATA
# Let's search for "const STREAM_DATA = {"
start_idx = text.find('const STREAM_DATA = {')
if start_idx != -1:
    sub = text[start_idx:start_idx+25000]
    keys = re.findall(r'^\s\s([a-zA-Z0-9_]+):\s*\{', sub, re.MULTILINE)
    print("Top-level keys in STREAM_DATA:", keys)
