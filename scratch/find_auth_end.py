with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('id="authModal"')
# Find closing </div> of authModal
div_count = 0
found_end = -1
for i in range(idx, len(text)):
    if text[i:i+4] == '<div':
        div_count += 1
    elif text[i:i+6] == '</div>':
        div_count -= 1
        if div_count == 0:
            found_end = i + 6
            break

print("authModal ends at:", found_end)
print(repr(text[found_end-20:found_end+80]))
