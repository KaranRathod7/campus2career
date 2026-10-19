import re
import subprocess

with open("index.html", "r", encoding="utf-8") as f:
    text = f.read()

script_match = re.search(r'<script>([\s\S]*?)</script>', text)
if script_match:
    with open("temp_syntax_test.js", "w", encoding="utf-8") as f:
        f.write(script_match.group(1))
    res = subprocess.run(["node", "--check", "temp_syntax_test.js"], capture_output=True, text=True)
    assert res.returncode == 0, f"JS Syntax error: {res.stderr}"
    print("[OK] JavaScript syntax verified with Node.js with 0 errors!")
