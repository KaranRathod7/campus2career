const fs = require('fs');

const code = fs.readFileSync('scratch/script5_clean.js', 'utf8');
const lines = code.split('\n');

const stack = []; // will store { type, line, col }
let inString = false;
let stringChar = '';
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
      if (stringChar === '`' && ch === '$' && next === '{') {
        stack.push({ type: '`${', line: i + 1, col: j });
        inString = false;
        j++;
        continue;
      }
      if (ch === stringChar && prev !== '\\') {
        inString = false;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      break;
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
      stack.push({ type: ch, line: i + 1, col: j });
    } else if (ch === '}' || ch === ')' || ch === ']') {
      if (stack.length === 0) {
        console.log(`Extra closing ${ch} at line ${i + 1}:${j}`);
      } else {
        const top = stack.pop();
        if ((top.type === '{' && ch !== '}') ||
            (top.type === '(' && ch !== ')') ||
            (top.type === '[' && ch !== ']') ||
            (top.type === '`${' && ch !== '}')) {
          console.log(`Mismatch: opened ${top.type} at line ${top.line}:${top.col}, but closed ${ch} at line ${i + 1}:${j}`);
        }
        if (top.type === '`${') {
          inString = true;
          stringChar = '`';
        }
      }
    }
  }
}

console.log('Remaining unclosed tokens in stack:', stack.length);
stack.forEach(item => {
  console.log(`  Unclosed ${item.type} at line ${item.line}:${item.col} -> Line content: "${lines[item.line - 1].trim()}"`);
});
