const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

let pos = 0;
let scriptIndex = 0;
let hasError = false;

while (true) {
  const openIdx = html.indexOf('<script', pos);
  if (openIdx === -1) break;
  const tagEnd = html.indexOf('>', openIdx);
  if (tagEnd === -1) break;
  const tagOpen = html.slice(openIdx, tagEnd + 1);
  const closeIdx = html.indexOf('</script>', tagEnd);
  if (closeIdx === -1) break;

  scriptIndex++;
  const code = html.slice(tagEnd + 1, closeIdx);
  pos = closeIdx + 9;

  if (tagOpen.includes('src=') || tagOpen.includes('application/ld+json')) {
    continue;
  }

  try {
    new vm.Script(code, { filename: `inline-script-${scriptIndex}.js` });
    console.log(`Script block #${scriptIndex} syntax: OK (${code.length} bytes)`);
  } catch (err) {
    console.error(`Script block #${scriptIndex} syntax error:`, err.message);
    hasError = true;
  }
}

if (!hasError) {
  console.log("All inline JavaScript in index.html passed syntax validation!");
} else {
  process.exit(1);
}
