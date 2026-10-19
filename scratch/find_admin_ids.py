with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

import re
matches = re.findall(r'id=["\']admin[^"\']*["\']', text)
print('admin matches in HTML:', set(matches))
