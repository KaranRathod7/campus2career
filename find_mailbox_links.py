with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'openEmailInboxModal|Campus2Career Mailbox|emailInboxModal', text)]
print(f"Found {len(matches)} occurrences:")
for idx in matches:
    print(text[max(0, idx-100):min(len(text), idx+150)])
    print('---')
