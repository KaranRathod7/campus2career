with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if any(k in line for k in ['c2c_user_stack', 'c2c_selected_stack', 'appState.user =', 'appState.user = JSON', 'defaultUser', 'rohan']):
        print(f'L{idx+1}: {line.strip()[:100]}')
