with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('id="authModal"')
print("authModal at:", idx)

# Find closing </div> of authModal
# Search for next modal comment
next_modal = text.find('<!--', idx)
print("Next comment at:", next_modal)
print(repr(text[next_modal:next_modal+60]))

# Check closeAuthModal
cam = text.find('function closeAuthModal')
print("closeAuthModal at:", cam)
print(repr(text[cam:cam+250]))
