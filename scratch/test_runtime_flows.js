const fs = require('fs');
const vm = require('vm');

// Mock standard browser DOM and localStorage for unit test
const storage = {};
const mockElements = {};

function createMockElement(id, tagName = 'div') {
  return {
    id,
    tagName,
    value: '',
    innerText: '',
    innerHTML: '',
    className: '',
    classList: {
      classes: new Set(),
      add(...args) { args.forEach(a => this.classes.add(a)); },
      remove(...args) { args.forEach(a => this.classes.delete(a)); },
      contains(a) { return this.classes.has(a); }
    },
    style: {},
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    querySelectorAll(selector) {
      return Object.values(mockElements).filter(el => {
        if (selector.startsWith('.')) return el.className && el.className.includes(selector.slice(1));
        if (selector.startsWith('#')) return el.id === selector.slice(1);
        return false;
      });
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    getAttribute(attr) { return this[attr] || null; },
    setAttribute(attr, val) { this[attr] = val; },
    scrollIntoView() {},
    remove() {}
  };
}

const mockDoc = {
  body: { style: {} },
  getElementById(id) {
    if (!mockElements[id]) {
      mockElements[id] = createMockElement(id);
    }
    return mockElements[id];
  },
  createElement(tag) {
    return createMockElement('el_' + Math.random().toString(36).substr(2, 9), tag);
  },
  querySelectorAll(selector) {
    return Object.values(mockElements).filter(el => {
      if (selector.startsWith('.')) return el.className && el.className.includes(selector.slice(1));
      if (selector.startsWith('#')) return el.id === selector.slice(1);
      return false;
    });
  },
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
  addEventListener: () => {}
};

// Initialize necessary mock DOM elements
[
  'onboardingModal', 'authModal', 'wizardStepTitle', 'obBranch', 'wizardYearLabel', 'wizardYearStatusHint',
  'wizardStreamLabel', 'wizardPresetsContainer', 'wizardCustomSkillsContainer', 'wizardSelectedPills',
  'wizardSkillLevelInputs', 'wizardStep1', 'wizardStep2', 'wizardStep3', 'wizardStep4',
  'wizardStep4Summary', 'wizardBackBtn', 'wizardNextBtn', 'dot1', 'dot2', 'dot3', 'dot4',
  'navStreamSelect', 'navStreamLabelDisplay', 'navStudentRoleBadge', 'activeStudentHeaderBadge',
  'roleBtn-learner', 'roleBtn-recruiter', 'navLearnerItems', 'navRecruiterItems',
  'growthTotalHours', 'growthStudySessionsCount', 'growthStreakDays', 'growthTestsCount', 'growthAvgScore',
  'screen-home', 'screen-analyzer', 'screen-growth', 'screen-resources', 'screen-mcq',
  'authActionsLoggedOut', 'authActionsLoggedIn'
].forEach(id => mockDoc.getElementById(id));

const sandbox = {
  addEventListener: () => {},
  scrollTo: () => {},
  window: null,
  document: mockDoc,
  localStorage: {
    getItem(k) { return storage[k] || null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; }
  },
  console: console,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  showToast: (msg) => console.log(`[Toast]: ${msg}`),
  Chart: class { destroy() {} update() {} }
};
sandbox.window = sandbox;

const html = fs.readFileSync('index.html', 'utf-8');
const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi);
let mainScript = '';
for (const s of scriptMatches) {
  const content = s.replace(/<script.*?>/i, '').replace(/<\/script>/i, '');
  if (content.length > 50000) {
    mainScript = content;
    break;
  }
}

vm.createContext(sandbox);
vm.runInContext(mainScript, sandbox);

function getAppState() {
  return vm.runInContext('appState', sandbox);
}

console.log("--- TEST 1: quickFacultyLogin() ---");
sandbox.quickFacultyLogin();
let appState = getAppState();
console.log(`Active Screen: ${appState.activeScreen}`);
console.log(`Active User: ${appState.user.name} (${appState.user.email})`);
console.log(`Verified Status: ${appState.user.verified}`);
console.log(`Current Stack Length: ${appState.currentStack.length}`);
if (appState.activeScreen !== 'analyzer') {
  console.error("FAIL: quickFacultyLogin did not navigate to analyzer screen!");
  process.exit(1);
}
console.log("PASS: quickFacultyLogin successfully loaded demo user and navigated to analyzer!");

console.log("\n--- TEST 2: startSkillEvaluationWithoutSignup() & Wizard Step 1 -> 2 -> 3 ---");
sandbox.startSkillEvaluationWithoutSignup();
appState = getAppState();
console.log(`Wizard Step: ${appState.currentWizardStep}`);
console.log(`Selected Role: ${appState.selectedRole}`);
console.log(`Selected Year: ${appState.selectedYear}`);
console.log(`Selected Stream: ${appState.selectedStream}`);

if (appState.currentWizardStep !== 1 || appState.selectedRole !== 'student' || appState.selectedYear !== 3) {
  console.error("FAIL: startSkillEvaluationWithoutSignup did not initialize correctly!");
  process.exit(1);
}

// Next to Step 2
sandbox.nextWizardStep();
appState = getAppState();
console.log(`Advancing to Step ${appState.currentWizardStep}...`);
const presetsContainer = mockDoc.getElementById('wizardPresetsContainer');
console.log(`Step 2 Presets Container Children Count: ${presetsContainer.children.length}`);
if (presetsContainer.children.length === 0) {
  console.error("FAIL: Step 2 Presets Container is empty!");
  process.exit(1);
}
console.log(`Current Stack Length in Step 2: ${appState.currentStack.length}`);

// Next to Step 3
sandbox.nextWizardStep();
appState = getAppState();
console.log(`Advancing to Step ${appState.currentWizardStep}...`);
const inputsContainer = mockDoc.getElementById('wizardSkillLevelInputs');
console.log(`Step 3 Inputs Container Children Count: ${inputsContainer.children.length}`);
if (inputsContainer.children.length === 0) {
  console.error("FAIL: Step 3 Inputs Container is empty!");
  process.exit(1);
}

// Verify that all skills defaulted to Intermediate (35%)
console.log("Verifying Step 3 skill scores:");
appState.currentStack.forEach(s => {
  console.log(`  - ${s.name}: ${s.score}%`);
  if (s.score !== 35) {
    console.error(`FAIL: Skill ${s.name} score is ${s.score}%, expected 35% (Intermediate)!`);
    process.exit(1);
  }
});
console.log("PASS: All skills correctly defaulted to Intermediate (35%)!");

// Next to Step 4
sandbox.nextWizardStep();
appState = getAppState();
console.log(`Advancing to Step ${appState.currentWizardStep}...`);
console.log(`Step 4 Title: ${mockDoc.getElementById('wizardStepTitle').innerText}`);

// Finish Wizard (Step 4 -> Analyzer)
sandbox.nextWizardStep();
appState = getAppState();
console.log(`Finished Wizard! Active Screen: ${appState.activeScreen}`);
if (appState.activeScreen !== 'analyzer') {
  console.error("FAIL: Completing wizard did not navigate to analyzer screen!");
  process.exit(1);
}
console.log("PASS: Wizard completed seamlessly into analyzer screen!");

console.log("\nALL RUNTIME TESTS PASSED WITH 100% SUCCESS!");
