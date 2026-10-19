with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

start = text.find('const STREAM_DATA = {')
end = text.find('const SKILL_CURRICULA =')
if end == -1:
    end = text.find('let evolutionChartInstance =')

stream_data_str = text[start:end]

import re
streams = re.findall(r'^\s\s([a-z0-9_]+):\s*\{', stream_data_str, re.MULTILINE)
print("Streams found in STREAM_DATA:", streams)

for s in streams:
    m = re.search(r'^\s\s' + s + r':\s*\{\s*name:\s*"([^"]+)"', stream_data_str, re.MULTILINE)
    name = m.group(1) if m else "Unknown"
    # check allSkills for this stream
    all_skills_m = re.search(r'allSkills:\s*\[(.*?)\]', stream_data_str[stream_data_str.find(f'{s}:'):], re.DOTALL)
    skills_count = len(re.findall(r'name:\s*[\'"][^\'"]+[\'"]', all_skills_m.group(1))) if all_skills_m else 0
    print(f"  Stream key: '{s}' -> Name: '{name}' -> allSkills count: {skills_count}")
