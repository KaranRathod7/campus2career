const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// Extract script content
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
let hasError = false;

while ((match = scriptRegex.exec(html)) !== null) {
  scriptIndex++;
  const scriptContent = match[1];
  // Skip external scripts or JSON-LD
  if (match[0].includes('src=') || match[0].includes('application/ld+json')) {
    continue;
  }
  try {
    new vm.Script(scriptContent, { filename: `inline-script-${scriptIndex}.js` });
    console.log(`Script block #${scriptIndex} syntax: OK (${scriptContent.length} bytes)`);
  } catch (err) {
    console.error(`Script block #${scriptIndex} syntax error:`, err.message);
    hasError = true;
  }
}

if (!hasError) {
  console.log("All JavaScript in index.html passed syntax validation!");
} else {
  process.exit(1);
}
