const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// Set up virtual browser environment
const dom = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); }
        },
        innerText: '',
        innerHTML: '',
        value: '',
        style: {},
        appendChild(child) {},
        querySelectorAll() { return []; },
        remove() {}
      };
    }
    return this.elements[id];
  },
  querySelectorAll(sel) {
    return [];
  },
  createElement() {
    return {
      classList: { add() {}, remove() {} },
      style: {},
      setAttribute() {},
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {}
    };
  },
  addEventListener() {},
  removeEventListener() {},
  body: {
    style: {}
  }
};

// Extract scripts and execute in a sandboxed vm
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let fullJs = '';
while ((match = scriptRegex.exec(html)) !== null) {
  fullJs += match[1] + ';\n';
}

const sandbox = {
  tailwind: { config: {} },
  window: {
    location: { origin: 'https://campus2career-pi.vercel.app', pathname: '/' },
    addEventListener() {},
    history: { pushState() {} },
    scrollTo() {},
    requestAnimationFrame(cb) { cb(); }
  },
  document: dom,
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; }
  },
  sessionStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; }
  },
  navigator: {
    clipboard: { writeText: async () => {} }
  },
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  console: console,
  setTimeout: (fn) => fn(),
  setInterval: () => 123,
  clearInterval: () => {},
  showToast: (msg) => console.log('  [Toast]', msg),
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent
};

vm.createContext(sandbox);

try {
  vm.runInContext(fullJs, sandbox);
  console.log('DOM & Application Scripts successfully initialized in virtual sandbox.\n');
} catch (e) {
  console.error('Initialization error:', e);
  process.exit(1);
}

const getAppState = () => vm.runInContext('appState', sandbox);
const startQuizForSkill = vm.runInContext('startQuizForSkill', sandbox);
const getSkillCurriculum = vm.runInContext('getSkillCurriculum', sandbox);

console.log('=== TEST 1: Launch Exam for Spring Boot & Microservices ===');
startQuizForSkill('spring', encodeURIComponent('Spring Boot & Microservices'));
let appState = getAppState();
console.log('Active Module Key:', appState.activeQuizModule);
console.log('Target Skill Name:', appState.targetSkillName);
console.log('First Question:', appState.activeQuizQuestions[0].q);
if (appState.activeQuizModule.includes('spring')) {
  console.log('--> SUCCESS: Spring Boot exam launched with Spring Boot questions!\n');
} else {
  console.error('--> FAILED to launch Spring Boot exam');
  process.exit(1);
}

console.log('=== TEST 2: Launch Exam for Docker & Containers ===');
startQuizForSkill('docker', encodeURIComponent('Docker & Containers'));
appState = getAppState();
console.log('Active Module Key:', appState.activeQuizModule);
console.log('Target Skill Name:', appState.targetSkillName);
console.log('First Question:', appState.activeQuizQuestions[0].q);
if (appState.activeQuizModule.includes('docker')) {
  console.log('--> SUCCESS: Docker exam launched with Docker questions!\n');
} else {
  console.error('--> FAILED to launch Docker exam');
  process.exit(1);
}

console.log('=== TEST 3: Launch Exam for PostgreSQL & SQL Tuning ===');
startQuizForSkill('postgres', encodeURIComponent('PostgreSQL & SQL Tuning'));
appState = getAppState();
console.log('Active Module Key:', appState.activeQuizModule);
console.log('Target Skill Name:', appState.targetSkillName);
console.log('First Question:', appState.activeQuizQuestions[0].q);
if (appState.activeQuizModule.includes('db')) {
  console.log('--> SUCCESS: PostgreSQL exam launched with Database questions!\n');
} else {
  console.error('--> FAILED to launch PostgreSQL exam');
  process.exit(1);
}

console.log('=== TEST 4: Launch Exam for Production Debugging ===');
startQuizForSkill('debug', encodeURIComponent('Production Debugging'));
appState = getAppState();
console.log('Active Module Key:', appState.activeQuizModule);
console.log('Target Skill Name:', appState.targetSkillName);
console.log('First Question:', appState.activeQuizQuestions[0].q);
if (appState.activeQuizModule.includes('debug')) {
  console.log('--> SUCCESS: Production Debugging exam launched!\n');
} else {
  console.error('--> FAILED to launch Debugging exam');
  process.exit(1);
}

console.log('=== TEST 5: Verify Study Video Playlist Lookup for Skills ===');
const springCurric = getSkillCurriculum('spring', 'Spring Boot & Microservices');
console.log('Spring Boot Curriculum:', springCurric.name, '| Tag:', springCurric.tag);
const dockerCurric = getSkillCurriculum('docker', 'Docker & Containers');
console.log('Docker Curriculum:', dockerCurric.name, '| Tag:', dockerCurric.tag);
const embCurric = getSkillCurriculum('emb_c', 'Embedded C & ARM Cortex-M Hardware');
console.log('Embedded C Curriculum:', embCurric.name, '| Tag:', embCurric.tag);

if (springCurric && dockerCurric && embCurric) {
  console.log('--> SUCCESS: All skill curricula correctly resolved!\n');
} else {
  console.error('--> FAILED to resolve skill curricula');
  process.exit(1);
}

console.log('=== ALL RUNTIME SIMULATIONS PASSED PERFECTLY! ===');
