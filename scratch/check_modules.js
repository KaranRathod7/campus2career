const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all quiz modules
const regex = /([a-zA-Z0-9_]+):\s*\{\s*title:\s*["']([^"']+)["']/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log(`${m[1]} -> ${m[2]}`);
}
