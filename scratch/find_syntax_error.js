const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('scratch/script5_clean.js', 'utf8');
const lines = code.split('\n');

console.log('Total lines:', lines.length);

// Let's test chunks from 0 to N to see where it breaks or why
// Usually an unclosed string or unclosed function or bracket
let depth = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    const prev = j > 0 ? line[j - 1] : '';
    const next = j < line.length - 1 ? line[j + 1] : '';

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        j++;
      }
      continue;
    }
    if (inString) {
      if (ch === stringChar && prev !== '\\') {
        inString = false;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      break; // rest of line is line comment
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      j++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ')' || ch === ']') {
      depth--;
    }
  }
}

console.log('Final depth:', depth, 'inString:', inString, 'stringChar:', stringChar);
