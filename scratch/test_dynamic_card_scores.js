const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('================================================================');
console.log(' TEST SUITE: DYNAMIC CARD TOTAL SCORE & OVERALL STACK READINESS ');
console.log('================================================================\n');

const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract main script block #5
const scriptMatches = [...htmlContent.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
const mainScript = scriptMatches[4][1];

// Setup mock DOM and environment
const mockElements = {};
function createMockElement(id, tagName = 'div') {
  let inner = '';
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    innerText: '',
    style: {},
    className: '',
    children: [],
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(attr, val) {
      this[attr] = val;
    },
    getAttribute(attr) {
      return this[attr];
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return inner; },
    set(val) {
      inner = val;
      if (val === '') el.children = [];
    }
  });
  return el;
}

const domIds = [
  'skillGaugesContainer',
  'activeStackPills',
  'overallStackScore',
  'overallProgressBar',
  'overallInsightText',
  'competenceProgressRing',
  'progressRingPercent',
  'guestEvaluationBanner'
];

domIds.forEach(id => {
  mockElements[id] = createMockElement(id);
});

const mockDocument = {
  getElementById: (id) => mockElements[id] || createMockElement(id),
  createElement: (tag) => createMockElement(`dyn-${Date.now()}-${Math.random()}`, tag),
  documentElement: { offsetWidth: 1024 }
};

const mockLocalStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

const mockSessionStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

const sandbox = {
  window: {},
  document: mockDocument,
  localStorage: mockLocalStorage,
  sessionStorage: mockSessionStorage,
  console: {
    log: () => {},
    warn: () => {},
    error: () => {}
  },
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  navigator: { userAgent: 'NodeTest' },
  location: { href: 'http://localhost/', replace: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.document.addEventListener = () => {};
sandbox.document.querySelectorAll = () => [];
sandbox.document.querySelector = () => null;

const ctx = vm.createContext(sandbox);

try {
  vm.runInContext(mainScript + "\n; window.appState = appState; window.renderSkillLevelDiagram = renderSkillLevelDiagram; window.calculateSkillBreakdown = calculateSkillBreakdown; window.getFusionColor = getFusionColor; window.getSkillTier = getSkillTier;", ctx);
} catch (e) {
  console.error("Context execution error:", e.message);
}

let passed = 0;
let total = 0;
function test(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
  }
}

console.log('--- 1. Verification of Initial HTML Target Stack Readiness Elements ---');
test('HTML contains #overallStackScore initialized to 35% instead of 70% or 75%', () => {
  assert(htmlContent.includes('<span id="overallStackScore" class="text-4xl font-extrabold text-[#008080] font-mono">35%</span>'),
    'Expected #overallStackScore to be 35% in HTML');
});

test('HTML contains #progressRingPercent initialized to 35%', () => {
  assert(htmlContent.includes('<span id="progressRingPercent" class="absolute text-[11px] font-black font-mono text-slate-800 dark:text-white">35%</span>'),
    'Expected #progressRingPercent to be 35% in HTML');
});

test('HTML contains #overallProgressBar initialized to width: 35%', () => {
  assert(htmlContent.includes('<div id="overallProgressBar" class="bg-[#008080] h-2 rounded-full transition-all duration-500" style="width: 35%"></div>'),
    'Expected #overallProgressBar width: 35% in HTML');
});

console.log('\n--- 2. Fresh Intermediate User Skill Level Breakdown Simulation ---');

// Set user as Intermediate (35% baseline)
sandbox.appState.user = {
  name: 'Test Student',
  email: 'student@example.com',
  initialLevel: 'intermediate',
  branch: 'it',
  activeTrackPreset: 'java_cloud'
};
sandbox.appState.mcqHistory = [];
sandbox.appState.progress = {
  completedLessonsBySkill: {},
  completedMarathons: {}
};

// Set currentStack to Java preset
sandbox.appState.currentStack = [
  { id: 'java', name: 'Java & Multithreading', base_percentage: 35, category: 'Backend Language' },
  { id: 'spring', name: 'Spring Boot & Microservices', base_percentage: 35, category: 'Architecture' }
];

// Trigger renderSkillLevelDiagram
sandbox.renderSkillLevelDiagram();

const container = mockElements.skillGaugesContainer;

test('Container renders 2 skill cards for Java and Spring Boot', () => {
  assert.strictEqual(container.children.length, 2);
});

test('Card 1 (Java): Top-right badge renders 35% (NEVER 72%)', () => {
  const cardHtml = container.children[0].innerHTML;
  assert(cardHtml.includes('>35%<'), 'Expected badge to be 35%');
  assert(!cardHtml.includes('>72%<'), 'Badge must not display 72%');
});

test('Card 1 (Java): Total Score renders 35% (NEVER 72%)', () => {
  const cardHtml = container.children[0].innerHTML;
  assert(cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">35%</span>'),
    'Expected Total Score: 35%');
  assert(!cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">72%</span>'),
    'Total Score must not display 72%');
});

test('Card 1 (Java): Progress bar width is 35%', () => {
  const cardHtml = container.children[0].innerHTML;
  assert(cardHtml.includes('style="width: 35%'), 'Expected progress bar width: 35%');
  assert(!cardHtml.includes('style="width: 72%'), 'Progress bar must not have width: 72%');
});

test('Card 1 (Java): Formula subtext pill arithmetic matches 35 + 0 + 0 + 0 = 35', () => {
  const cardHtml = container.children[0].innerHTML;
  assert(cardHtml.includes('Base: <strong class="text-slate-900 dark:text-white">35%</strong>'), 'Base is 35%');
  assert(cardHtml.includes('Lectures: <strong>+0%/15%</strong> (0/15)'), 'Lectures is 0%');
  assert(cardHtml.includes('Marathon: <strong>+0%/3%</strong>'), 'Marathon is 0%');
  assert(cardHtml.includes('Diagnostic: <strong>+0%/34%</strong>'), 'Diagnostic is 0%');
});

test('Card 2 (Spring Boot): Top-right badge renders 35% (NEVER 65%)', () => {
  const cardHtml = container.children[1].innerHTML;
  assert(cardHtml.includes('>35%<'), 'Expected badge to be 35%');
  assert(!cardHtml.includes('>65%<'), 'Badge must not display 65%');
});

test('Card 2 (Spring Boot): Total Score renders 35% (NEVER 65%)', () => {
  const cardHtml = container.children[1].innerHTML;
  assert(cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">35%</span>'),
    'Expected Total Score: 35%');
  assert(!cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">65%</span>'),
    'Total Score must not display 65%');
});

console.log('\n--- 3. Target Stack Readiness Score Card Verification ---');
test('Target Stack Readiness Score displays arithmetic mean 35% (NEVER 75% or 70%)', () => {
  const scoreEl = mockElements.overallStackScore;
  assert.strictEqual(scoreEl.innerText, '35%');
});

test('Target Stack Readiness progress bar is 35%', () => {
  const barEl = mockElements.overallProgressBar;
  assert.strictEqual(barEl.style.width, '35%');
});

test('Target Stack Readiness progress ring percent is 35%', () => {
  const ringPercentEl = mockElements.progressRingPercent;
  assert.strictEqual(ringPercentEl.innerText, '35%');
});

console.log('\n--- 4. Dynamic Progression: 5 Lectures Completed (+5%) ---');
// Award 5 lectures completed for Java
sandbox.appState.progress.completedLessonsBySkill = {
  java: ['l1', 'l2', 'l3', 'l4', 'l5']
};

sandbox.renderSkillLevelDiagram();

test('Card 1 (Java): Dynamically increments from 35% to 40% (35 base + 5 lectures)', () => {
  const cardHtml = container.children[0].innerHTML;
  assert(cardHtml.includes('>40%<'), 'Expected badge to be 40%');
  assert(cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">40%</span>'), 'Total Score 40%');
  assert(cardHtml.includes('Lectures: <strong>+5%/15%</strong> (5/15)'), 'Lectures: +5%/15% (5/15)');
});

test('Card 2 (Spring Boot): Remains at 35% with 0 lectures', () => {
  const cardHtml = container.children[1].innerHTML;
  assert(cardHtml.includes('>35%<'), 'Expected badge to be 35%');
  assert(cardHtml.includes('Total Score: <span class="text-[#008080] dark:text-teal-300 font-black">35%</span>'), 'Total Score 35%');
});

test('Overall Stack Readiness Score reflects new arithmetic mean: Math.round((40 + 35) / 2) = 38%', () => {
  const scoreEl = mockElements.overallStackScore;
  assert.strictEqual(scoreEl.innerText, '38%');
  assert.strictEqual(mockElements.overallProgressBar.style.width, '38%');
});

console.log('\n--- 5. Legacy Storage & Preset Override Sanitization ---');
test('Preset or mock strings "score: 72" and "score: 65" are completely absent from index.html', () => {
  const has72 = /score:\s*72/.test(htmlContent);
  const has65 = /score:\s*65/.test(htmlContent);
  assert(!has72, 'Found hardcoded score: 72');
  assert(!has65, 'Found hardcoded score: 65');
});

console.log('\n================================================================');
console.log(` SUMMARY: ${passed}/${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
console.log('================================================================\n');

if (passed !== total) process.exit(1);
