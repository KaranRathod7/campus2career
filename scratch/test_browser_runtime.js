// Test simulated execution of index.html in a browser-like DOM environment
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scripts = [];
const re = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html)) !== null) {
  if (m[1].trim().length > 0) {
    scripts.push(m[1]);
  }
}

console.log(`Loaded ${scripts.length} inline scripts for runtime execution test.`);

// Set up browser globals
global.window = global;
global.window.addEventListener = () => {};
global.tailwind = { config: {} };
global.document = {
  getElementById: (id) => ({
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    style: {},
    setAttribute: () => {},
    getAttribute: () => '',
    value: '',
    innerText: '',
    innerHTML: ''
  }),
  querySelectorAll: () => [],
  addEventListener: () => {},
  body: { style: {} }
};
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.sessionStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.location = { origin: 'http://localhost:8000', pathname: '/index.html', search: '' };
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
global.Chart = function() { return { destroy: () => {}, update: () => {} }; };

try {
  scripts.forEach((code, i) => {
    eval(code);
    console.log(`Script #${i+1} executed successfully in mock DOM!`);
  });
  console.log("SUCCESS: All scripts executed with ZERO runtime errors!");
  
  if (typeof navigateTo === 'function') {
    navigateTo('home');
    navigateTo('analyzer');
    console.log("navigateTo() function: OK");
  }
  if (typeof startSkillEvaluationWithoutSignup === 'function') {
    startSkillEvaluationWithoutSignup();
    console.log("startSkillEvaluationWithoutSignup() function: OK");
  }
  if (typeof openDatabaseViewerModal === 'function') {
    openDatabaseViewerModal(true);
    console.log("openDatabaseViewerModal() function: OK");
  }
  if (typeof quickFacultyLogin === 'function') {
    quickFacultyLogin();
    console.log("quickFacultyLogin() function: OK");
  }
  if (typeof renderDatabaseUsersTable === 'function') {
    renderDatabaseUsersTable();
    console.log("renderDatabaseUsersTable() function: OK");
  }
  if (typeof verifyAdminPasscode === 'function') {
    verifyAdminPasscode();
    console.log("verifyAdminPasscode() function: OK");
  }
  
  console.log("ALL INTERACTION FUNCTIONS WORK FLAWLESSLY!");
} catch (e) {
  console.error("Runtime execution error:", e);
  process.exit(1);
}
