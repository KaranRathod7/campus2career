const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.match(/^\s*(ece|cse|it|aids|mechanical):\s*\{/)) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
  if (l.match(/^\s*allSkills:\s*\[/)) {
    console.log(`  allSkills at Line ${i+1}`);
  }
});
