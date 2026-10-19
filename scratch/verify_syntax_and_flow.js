const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');

// 1. Check for basic HTML script tag syntax validity
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi);
console.log(`Found ${scriptMatches ? scriptMatches.length : 0} script tags.`);

// 2. Extract the main application script (the large one)
let mainScript = '';
for (const s of scriptMatches) {
  const content = s.replace(/<script.*?>/i, '').replace(/<\/script>/i, '');
  if (content.length > 50000) {
    mainScript = content;
    break;
  }
}
console.log(`Main script length: ${mainScript.length} chars.`);

// 3. Test compilation / syntax of the main script using Node's vm module
const vm = require('vm');
try {
  new vm.Script(mainScript);
  console.log("SUCCESS: Main script compiled with zero JavaScript syntax errors!");
} catch (err) {
  console.error("SYNTAX ERROR in main script:", err);
  process.exit(1);
}

// 4. Verify presence of key functions
const checks = [
  'function updateNavStreamLabel',
  'function updateGrowthSummaryCards',
  'function quickFacultyLogin',
  'function startSkillEvaluationWithoutSignup',
  'function renderWizardPresets',
  'function renderWizardSkillLevelInputs',
  'function selectWizardPreset'
];

checks.forEach(c => {
  const found = html.includes(c);
  console.log(`Check [${c}]: ${found ? 'PASSED' : 'FAILED'}`);
  if (!found) process.exit(1);
});

// 5. Verify default score 35% in selectWizardPreset & renderWizardSkillLevelInputs
const scoreCheck1 = html.includes('s.score = 35; // Default all skills to Intermediate (35%)');
const scoreCheck2 = html.includes('if (s.score === undefined || s.score === null) s.score = 35;');
console.log(`Intermediate default score in selectWizardPreset: ${scoreCheck1 ? 'PASSED' : 'FAILED'}`);
console.log(`Intermediate default score in renderWizardSkillLevelInputs: ${scoreCheck2 ? 'PASSED' : 'FAILED'}`);

if (!scoreCheck1 || !scoreCheck2) process.exit(1);

console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
