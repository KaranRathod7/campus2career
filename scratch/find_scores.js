const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('score <= 40') || l.includes('s.score <= 40') || l.includes('currentScore <= 40')) {
    console.log(`Line ${i+1}: ${l.trim()}`);
  }
});
