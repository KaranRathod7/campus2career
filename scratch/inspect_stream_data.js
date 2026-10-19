const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const startIdx = html.indexOf('const STREAM_DATA =');
const endIdx = html.indexOf('const SENIOR_ROLE_PRESETS', startIdx);
const sub = html.substring(startIdx + 'const STREAM_DATA ='.length, endIdx).trim().replace(/;\s*$/, '');
const data = new Function('return ' + sub)();
for (const [k, v] of Object.entries(data)) {
  console.log(`\n=== ${k.toUpperCase()} (${v.name}) === (Total: ${(v.allSkills || []).length})`);
  (v.allSkills || []).forEach(s => console.log(`  - [${s.id}] ${s.name} (${s.category || 'General'})`));
}
