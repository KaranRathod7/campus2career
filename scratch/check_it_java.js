const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find questions in it_java
const startIdx = html.indexOf('it_java: {');
const endIdx = html.indexOf('it_db: {');
console.log(html.substring(startIdx, startIdx + 2000));
