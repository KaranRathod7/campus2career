with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

pos = text.find('function applyStreamChange(')
pos_end = text.find('function openStreamIntakeWizard(', pos)
print(text[pos:pos_end])
