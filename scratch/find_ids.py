import re

with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

ids = re.findall(r'id=["\']([^"\']+)["\']', text)
matched_ids = [x for x in set(ids) if any(k in x.lower() for k in ['modal', 'admin', 'data', 'db', 'users'])]
print('Matched IDs:')
for x in sorted(matched_ids):
    print(' ', x)
