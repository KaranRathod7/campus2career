const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log(' PROGRESSIVE ENTER-KEY NAVIGATION & SUBMIT TEST     ');
console.log('====================================================\n');

const html = fs.readFileSync('index.html', 'utf8');

// Extract the handleFormEnterKey function implementation from index.html
const fnRegex = /function handleFormEnterKey\(event,\s*formElement,\s*submitButtonSelector\)\s*\{([\s\S]*?)\n    \}/;
const match = html.match(fnRegex);
assert(match, 'handleFormEnterKey function definition not found in index.html');

// Create an evaluator function for handleFormEnterKey in a mock DOM environment
const handleFormEnterKeyFn = new Function('event', 'formElement', 'submitButtonSelector', match[1]);

let total = 0;
let passed = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${desc}`);
  } catch (e) {
    console.error(`  [FAIL] ${desc}: ${e.message}`);
  }
}

// Minimal DOM Element Mock
class MockElement {
  constructor(tagName, id = '', className = '', type = 'text') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.type = type;
    this.disabled = false;
    this.style = {};
    this.offsetParent = {}; // truthy = visible
    this.parentElement = null;
    this.children = [];
    this._focused = false;
    this._clicked = false;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const traverse = (node) => {
      for (const c of node.children) {
        if (matchesSelector(c, selector)) {
          results.push(c);
        }
        traverse(c);
      }
    };
    traverse(this);
    return results;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (matchesSelector(curr, selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  focus() {
    this._focused = true;
  }

  click() {
    this._clicked = true;
  }
}

function matchesSelector(el, selector) {
  if (selector.includes(',')) {
    return selector.split(',').some(s => matchesSelector(el, s.trim()));
  }
  if (selector.startsWith('#')) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith('.')) {
    return el.className.split(/\s+/).includes(selector.slice(1));
  }
  const tag = el.tagName.toLowerCase();
  if (selector.startsWith('button') && tag === 'button') return true;
  if (selector.startsWith('input') && tag === 'input') return el.type !== 'hidden';
  if (selector.startsWith('select') && tag === 'select') return true;
  return false;
}

// Setup global mock environment
global.window = {
  getComputedStyle: () => ({ position: 'static' })
};
global.document = {
  querySelector: () => null
};

console.log('--- 1. Universal Form Handler Core Logic Tests ---');

it('Ignores non-Enter keys (e.g. Tab, Escape, letters)', () => {
  const form = new MockElement('div', 'testForm');
  const inp1 = new MockElement('input', 'inp1');
  const inp2 = new MockElement('input', 'inp2');
  form.appendChild(inp1);
  form.appendChild(inp2);

  let defaultPrevented = false;
  const event = { key: 'Tab', shiftKey: false, target: inp1, preventDefault: () => { defaultPrevented = true; } };

  handleFormEnterKeyFn(event, form, '#btn');
  assert.strictEqual(defaultPrevented, false, 'Default should not be prevented for Tab');
  assert.strictEqual(inp2._focused, false, 'Next input should not be focused');
});

it('Ignores Shift+Enter to allow newline/multiline actions', () => {
  const form = new MockElement('div', 'testForm');
  const inp1 = new MockElement('input', 'inp1');
  form.appendChild(inp1);

  let defaultPrevented = false;
  const event = { key: 'Enter', shiftKey: true, target: inp1, preventDefault: () => { defaultPrevented = true; } };

  handleFormEnterKeyFn(event, form, '#btn');
  assert.strictEqual(defaultPrevented, false, 'Default should not be prevented for Shift+Enter');
});

it('Does not override multiline textarea behavior', () => {
  const form = new MockElement('div', 'testForm');
  const txt = new MockElement('textarea', 'notes');
  form.appendChild(txt);

  let defaultPrevented = false;
  const event = { key: 'Enter', shiftKey: false, target: txt, preventDefault: () => { defaultPrevented = true; } };

  handleFormEnterKeyFn(event, form, '#btn');
  assert.strictEqual(defaultPrevented, false, 'Enter in textarea should not be intercepted');
});

it('Smoothly advances focus from intermediate input to next input', () => {
  const form = new MockElement('div', 'testForm');
  const inp1 = new MockElement('input', 'field1');
  const inp2 = new MockElement('input', 'field2');
  const inp3 = new MockElement('input', 'field3');
  const btn = new MockElement('button', 'submitBtn');
  form.appendChild(inp1);
  form.appendChild(inp2);
  form.appendChild(inp3);
  form.appendChild(btn);

  let defaultPrevented = false;
  const event = { key: 'Enter', shiftKey: false, target: inp1, preventDefault: () => { defaultPrevented = true; } };

  handleFormEnterKeyFn(event, form, '#submitBtn');
  assert.strictEqual(defaultPrevented, true, 'Default must be prevented');
  assert.strictEqual(inp2._focused, true, 'Field 2 must be focused');
  assert.strictEqual(btn._clicked, false, 'Submit button must not be clicked on intermediate field');
});

it('Triggers programmatic button click on the final input field', () => {
  const form = new MockElement('div', 'testForm');
  const inp1 = new MockElement('input', 'field1');
  const inp2 = new MockElement('input', 'field2');
  const btn = new MockElement('button', 'submitBtn');
  form.appendChild(inp1);
  form.appendChild(inp2);
  form.appendChild(btn);

  let defaultPrevented = false;
  const event = { key: 'Enter', shiftKey: false, target: inp2, preventDefault: () => { defaultPrevented = true; } };

  handleFormEnterKeyFn(event, form, '#submitBtn');
  assert.strictEqual(defaultPrevented, true, 'Default must be prevented');
  assert.strictEqual(btn._clicked, true, 'Submit button must be clicked on last field');
});

console.log('\n--- 2. Sign Up Form Simulation ---');

it('Sign Up: Name -> Username -> Email -> Password -> Create Account Submit', () => {
  const form = new MockElement('div', 'authStandardFields');
  const nameField = new MockElement('div', 'authNameField');
  const nameInput = new MockElement('input', 'authNameInput');
  nameField.appendChild(nameInput);

  const userField = new MockElement('div', 'authUsernameField');
  const userInput = new MockElement('input', 'authUsernameInput');
  userField.appendChild(userInput);

  const emailInput = new MockElement('input', 'authEmailInput');
  const passInput = new MockElement('input', 'authPassInput');
  const submitBtn = new MockElement('button', 'authSubmitBtn');

  form.appendChild(nameField);
  form.appendChild(userField);
  form.appendChild(emailInput);
  form.appendChild(passInput);
  form.appendChild(submitBtn);

  // Step 1: Press Enter in authNameInput
  handleFormEnterKeyFn({ key: 'Enter', target: nameInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(userInput._focused, true, 'Name -> Username focus transition');

  // Step 2: Press Enter in authUsernameInput
  handleFormEnterKeyFn({ key: 'Enter', target: userInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(emailInput._focused, true, 'Username -> Email focus transition');

  // Step 3: Press Enter in authEmailInput
  handleFormEnterKeyFn({ key: 'Enter', target: emailInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(passInput._focused, true, 'Email -> Password focus transition');

  // Step 4: Press Enter in authPassInput
  handleFormEnterKeyFn({ key: 'Enter', target: passInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(submitBtn._clicked, true, 'Password Enter -> Triggers authSubmitBtn.click()');
});

console.log('\n--- 3. Log In Form Simulation (Hidden Name & Username) ---');

it('Log In: Name and Username hidden -> Email -> Password -> Log In Submit', () => {
  const form = new MockElement('div', 'authStandardFields');
  const nameField = new MockElement('div', 'authNameField', 'hidden');
  const nameInput = new MockElement('input', 'authNameInput');
  nameField.appendChild(nameInput);

  const userField = new MockElement('div', 'authUsernameField', 'hidden');
  const userInput = new MockElement('input', 'authUsernameInput');
  userField.appendChild(userInput);

  const emailInput = new MockElement('input', 'authEmailInput');
  const passInput = new MockElement('input', 'authPassInput');
  const submitBtn = new MockElement('button', 'authSubmitBtn');

  form.appendChild(nameField);
  form.appendChild(userField);
  form.appendChild(emailInput);
  form.appendChild(passInput);
  form.appendChild(submitBtn);

  // In Log In mode, pressing Enter on authEmailInput must skip hidden fields and go straight to authPassInput
  handleFormEnterKeyFn({ key: 'Enter', target: emailInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(passInput._focused, true, 'Email -> Password focus transition in Log In mode');

  // Pressing Enter on authPassInput triggers submit
  handleFormEnterKeyFn({ key: 'Enter', target: passInput, preventDefault: () => {} }, form, '#authSubmitBtn');
  assert.strictEqual(submitBtn._clicked, true, 'Password Enter -> Triggers authSubmitBtn.click() in Log In mode');
});

console.log('\n--- 4. Verification Code Step Simulation ---');

it('PIN Verification: 6-digit code Enter -> Triggers authVerifySubmitBtn', () => {
  const form = new MockElement('div', 'authVerifyStep');
  const codeInput = new MockElement('input', 'authVerificationCodeInput');
  const verifyBtn = new MockElement('button', 'authVerifySubmitBtn');
  form.appendChild(codeInput);
  form.appendChild(verifyBtn);

  handleFormEnterKeyFn({ key: 'Enter', target: codeInput, preventDefault: () => {} }, form, '#authVerifySubmitBtn');
  assert.strictEqual(verifyBtn._clicked, true, 'Verification code Enter -> Triggers verify submission');
});

console.log('\n--- 5. Onboarding Wizard Step 1 Simulation ---');

it('Wizard Step 1: College -> Branch -> Continue Next Button', () => {
  const form = new MockElement('div', 'wizardStep1');
  const collegeInput = new MockElement('input', 'obCollege');
  const branchSelect = new MockElement('select', 'obBranch');
  const nextBtn = new MockElement('button', 'wizardNextBtn');
  form.appendChild(collegeInput);
  form.appendChild(branchSelect);
  form.appendChild(nextBtn);

  // Press Enter on College input
  handleFormEnterKeyFn({ key: 'Enter', target: collegeInput, preventDefault: () => {} }, form, '#wizardNextBtn');
  assert.strictEqual(branchSelect._focused, true, 'College -> Branch focus transition');

  // Press Enter on Branch select
  handleFormEnterKeyFn({ key: 'Enter', target: branchSelect, preventDefault: () => {} }, form, '#wizardNextBtn');
  assert.strictEqual(nextBtn._clicked, true, 'Branch select Enter -> Triggers wizardNextBtn.click()');
});

console.log('\n--- 6. Admin Authentication Modal Simulation ---');

it('Admin Modal: Admin Email -> Admin Master Key -> Sovereign Unlock Button', () => {
  const form = new MockElement('div', 'adminAuthModal');
  const emailInput = new MockElement('input', 'adminEmailInput');
  const keyInput = new MockElement('input', 'adminSecretKeyInput');
  const verifyBtn = new MockElement('button', 'adminVerifyBtn');
  form.appendChild(emailInput);
  form.appendChild(keyInput);
  form.appendChild(verifyBtn);

  // Press Enter on admin email input
  handleFormEnterKeyFn({ key: 'Enter', target: emailInput, preventDefault: () => {} }, form, '#adminVerifyBtn');
  assert.strictEqual(keyInput._focused, true, 'Admin Email -> Admin Secret Key focus transition');

  // Press Enter on admin secret key input
  handleFormEnterKeyFn({ key: 'Enter', target: keyInput, preventDefault: () => {} }, form, '#adminVerifyBtn');
  assert.strictEqual(verifyBtn._clicked, true, 'Admin Secret Key Enter -> Triggers adminVerifyBtn.click()');
});

console.log('\n--- 7. Verification of index.html Wiring ---');

it('index.html contains onkeydown="handleFormEnterKey(event, this, ...)" on key form containers', () => {
  assert(html.includes('id="authStandardFields" class="space-y-3" onkeydown="handleFormEnterKey(event, this, \'#authSubmitBtn\')"'), 'Missing onkeydown on authStandardFields');
  assert(html.includes('id="authVerifyStep" class="hidden space-y-4" onkeydown="handleFormEnterKey(event, this, \'#authVerifySubmitBtn\')"'), 'Missing onkeydown on authVerifyStep');
  assert(html.includes('id="wizardStep1" class="wizard-pane block space-y-4" onkeydown="handleFormEnterKey(event, this, \'#wizardNextBtn\')"'), 'Missing onkeydown on wizardStep1');
  assert(html.includes('class="p-6 space-y-4" onkeydown="handleFormEnterKey(event, this, \'#adminVerifyBtn\')"'), 'Missing onkeydown on adminAuthModal body');
});

it('index.html contains window.handleFormEnterKey and initProgressiveFormNavigation', () => {
  assert(html.includes('window.handleFormEnterKey = handleFormEnterKey;'), 'Missing window.handleFormEnterKey export');
  assert(html.includes('function initProgressiveFormNavigation()'), 'Missing initProgressiveFormNavigation definition');
});

console.log('\n====================================================');
console.log(` SUMMARY: ${passed}/${total} Tests Passed (${Math.round(passed/total * 100)}%)`);
console.log('====================================================\n');

if (passed !== total) {
  process.exit(1);
}
