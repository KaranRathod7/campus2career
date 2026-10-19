# -*- coding: utf-8 -*-
with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

import re

# Check allSkills in each stream
for stream_key in ['ece', 'cse', 'it', 'aids', 'mechanical']:
    idx = text.find(f'{stream_key}:')
    if idx != -1:
        # find allSkills after idx
        all_skills_idx = text.find('allSkills:', idx)
        if all_skills_idx == -1:
            all_skills_idx = text.find('"allSkills":', idx)
        print(f"Stream {stream_key}: found at {idx}, allSkills at {all_skills_idx}")
    else:
        print(f"Stream {stream_key}: NOT found!")
