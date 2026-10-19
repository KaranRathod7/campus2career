with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('function applyPresetStack(')
print('=== applyPresetStack ===')
print(text[pos:pos+1500])

pos2 = text.find('function selectWizardPreset(')
print('=== selectWizardPreset ===')
print(text[pos2:pos2+1500])
