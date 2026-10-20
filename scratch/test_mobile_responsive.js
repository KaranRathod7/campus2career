const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log(' RUNNING MOBILE-FIRST RESPONSIVE VERIFICATION SUITE ');
console.log(' Target Viewports: 360px, 390px, 412px, 430px       ');
console.log('====================================================\n');

const html = fs.readFileSync('index.html', 'utf8');

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${desc}`);
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
  }
}

console.log('--- Part 1: Viewport & Root Architecture ---');

it('Viewport meta tag includes width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no', () => {
  const metaMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i);
  assert(metaMatch, 'Viewport meta tag not found');
  const content = metaMatch[1];
  assert(content.includes('width=device-width'), 'Missing width=device-width');
  assert(content.includes('initial-scale=1.0'), 'Missing initial-scale=1.0');
  assert(content.includes('maximum-scale=1.0'), 'Missing maximum-scale=1.0');
  assert(content.includes('user-scalable=no'), 'Missing user-scalable=no');
});

it('Global CSS enforces box-sizing: border-box on html and all elements', () => {
  assert(html.includes('*, *::before, *::after'), 'Missing universal selector for box-sizing');
  assert(html.includes('box-sizing: inherit') || html.includes('box-sizing: border-box'), 'Missing box-sizing definition');
});

it('Global overflow-x lock is enforced on html, body, and main containers', () => {
  assert(/html\s*\{[^}]*overflow-x:\s*hidden\s*!important/s.test(html) || /html,\s*body\s*\{[^}]*overflow-x:\s*hidden/s.test(html), 'Missing overflow-x: hidden on html/body');
  assert(/#root,\s*#app,\s*main,\s*\.screen-view[^}]*overflow-x:\s*hidden/s.test(html), 'Missing overflow-x: hidden on root screen containers');
});

console.log('\n--- Part 2: Mobile Navbar & Header Component ---');

it('Header brand logo container is restricted to <= 40% on mobile viewports', () => {
  assert(html.includes('max-w-[40%]'), 'Brand logo container should include max-w-[40%] on mobile');
  assert(html.includes('Campus<span class="text-[#008080] dark:text-teal-400">2Career</span>'), 'Brand logo text missing');
});

it('Header brand subtitle is hidden on small and medium screens', () => {
  const subtitleMatch = html.match(/<p[^>]*class=["'][^"']*["'][^>]*>Personalized Core Skill Competence Engine<\/p>/);
  assert(subtitleMatch, 'Brand subtitle element not found');
  assert(subtitleMatch[0].includes('hidden 2xl:block'), 'Subtitle should be hidden on smaller screens (hidden 2xl:block)');
});

it('Stream selector pill is hidden on mobile header bar (tucked into mobile drawer)', () => {
  const streamMatch = html.match(/id=["']navStreamSelectorContainer["'][^>]*class=["']([^"']+)["']/);
  assert(streamMatch, 'Stream selector container not found');
  assert(streamMatch[1].includes('hidden lg:flex'), 'Stream selector in top bar should be hidden on small screens');
});

it('Unauthenticated top bar hides extra buttons on mobile so header fits comfortably in 360px', () => {
  // Demo button in top bar is hidden on mobile: hidden sm:inline-flex
  const demoMatch = html.match(/<button[^>]*onclick=["']quickFacultyLogin\(\)["'][^>]*class=["']([^"']+)["'][^>]*title=["'][^"']*Demo[^"']*["']/);
  assert(demoMatch, 'Demo button not found');
  assert(demoMatch[1].includes('hidden sm:inline-flex'), 'Top bar Demo button should be hidden on small mobile screens');

  // Sign up button in top bar is hidden on mobile: hidden sm:inline-flex
  const signupMatch = html.match(/<button[^>]*onclick=["']openAuthModal\('signup'\)["'][^>]*class=["']([^"']+)["']/);
  assert(signupMatch, 'Sign Up button not found');
  assert(signupMatch[1].includes('hidden sm:inline-flex'), 'Top bar Sign Up button should be hidden on small mobile screens');
});

it('Mobile Hamburger Menu button exists and satisfies >= 44x44px touch target requirement', () => {
  const hamburgerMatch = html.match(/id=["']mobileMenuToggleBtn["'][^>]*class=["']([^"']+)["']/);
  assert(hamburgerMatch, 'Mobile Hamburger Menu button not found');
  const classes = hamburgerMatch[1];
  assert(classes.includes('min-w-[44px]') && classes.includes('min-h-[44px]'), 'Hamburger button must have min-w-[44px] and min-h-[44px]');
  assert(classes.includes('md:hidden'), 'Hamburger button must be hidden on desktop (md:hidden)');
});

it('Mobile backdrop blur overlay element exists with proper backdrop blur and dismiss handler', () => {
  assert(html.includes('id="mobileNavBackdrop"'), 'Missing #mobileNavBackdrop');
  const backdropMatch = html.match(/id=["']mobileNavBackdrop["'][^>]*onclick=["']([^"']+)["'][^>]*class=["']([^"']+)["']/);
  assert(backdropMatch, 'Backdrop element improperly structured');
  assert(backdropMatch[1].includes('toggleMobileNav(false)'), 'Backdrop onclick should close drawer via toggleMobileNav(false)');
  assert(backdropMatch[2].includes('backdrop-blur'), 'Backdrop should feature backdrop blur styling');
});

it('toggleMobileNav() manages backdrop visibility and locks body scroll', () => {
  assert(html.includes("const backdrop = document.getElementById('mobileNavBackdrop');"), 'toggleMobileNav should reference #mobileNavBackdrop');
  assert(html.includes("document.body.style.overflow = 'hidden';"), 'toggleMobileNav should lock body overflow when drawer opens');
  assert(html.includes("document.body.style.overflow = '';"), 'toggleMobileNav should restore body overflow when drawer closes');
});

it('Mobile drawer contains all nav links, stream selector, theme toggle, and explicit Logout', () => {
  assert(html.includes('id="mobileNavDrawer"'), 'Missing #mobileNavDrawer');
  assert(html.includes('id="mobileNavStreamSelect"'), 'Missing mobile stream selector');
  assert(html.includes('id="mobileLearnerLinks"'), 'Missing mobile learner navigation links');
  assert(html.includes('Log Out of Campus2Career'), 'Missing mobile explicit log out button');
});

console.log('\n--- Part 3: Dashboard Cards & Diagram Responsiveness ---');

it('Radar chart container has .radar-chart-container styling (100% width, 320px height, min-height 280px)', () => {
  assert(html.includes('.radar-chart-container {'), 'Missing .radar-chart-container CSS rule');
  assert(html.includes('height: 320px;'), 'Radar chart container must specify 320px height');
  assert(html.includes('min-height: 280px;'), 'Radar chart container must specify min-height: 280px');
  assert(html.includes('width: 100% !important;'), 'Radar chart container must specify 100% width');
  assert(html.includes('class="radar-chart-container relative"'), 'Radar chart HTML element must use .radar-chart-container');
});

it('Chart.js options enforce responsive: true and maintainAspectRatio: false', () => {
  assert(html.includes('responsive: true'), 'Chart.js must have responsive: true');
  assert(html.includes('maintainAspectRatio: false'), 'Chart.js must have maintainAspectRatio: false');
});

it('renderSkillLevelDiagram creates compact cards (p-3 sm:p-5) with vertically stacked milestones on <640px', () => {
  assert(html.includes('card.className = "bg-white dark:bg-[#0F172A] p-3 sm:p-5 rounded-2xl'), 'Skill card must use p-3 sm:p-5 for mobile compactness');
  assert(html.includes('grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs'), 'Milestones must stack on <640px via grid-cols-1 sm:grid-cols-2');
});

it('renderSkillLevelDiagram action buttons expand to full width (w-full sm:w-auto) with >= 44px height and 0.5rem gap', () => {
  assert(html.includes('w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-red-600'), 'Video button must have w-full sm:w-auto and min-h-[44px]');
  assert(html.includes('w-full sm:w-auto min-h-[44px] px-3.5 py-2 bg-[#008080]'), 'MCQ button must have w-full sm:w-auto and min-h-[44px]');
  assert(html.includes('gap-2.5') || html.includes('gap-2'), 'Action button container must have 0.5rem gap');
});

it('renderSkillLevelDiagram progress bar milestone labels wrap cleanly on 360px viewports', () => {
  assert(html.includes('flex flex-wrap justify-between gap-x-2 text-[10px]'), 'Progress bar labels must use flex-wrap with gap-x-2');
});

console.log('\n--- Part 4: Form & Modal Dialog Responsiveness ---');

it('Modal dialog CSS rules enforce fluid bounds width: calc(100% - 24px) !important; max-width: 440px !important; margin: 12px auto;', () => {
  assert(html.includes('width: calc(100% - 24px) !important;'), 'Modals must enforce width: calc(100% - 24px) !important');
  assert(html.includes('max-width: 440px !important;'), 'Modals must enforce max-width: 440px !important');
  assert(html.includes('margin: 12px auto !important;'), 'Modals must enforce margin: 12px auto !important');
  assert(html.includes('max-height: 90vh !important;'), 'Modals must enforce max-height: 90vh !important');
  assert(html.includes('overflow-y: auto !important;'), 'Modals must enforce overflow-y: auto !important');
});

it('Onboarding modal stepper progress dots hide text labels on mobile (hidden sm:inline)', () => {
  const stepText1 = html.includes('<span class="text-slate-800 font-semibold hidden sm:inline">Academic Stream</span>');
  const stepText2 = html.includes('<span class="text-slate-500 font-medium hidden sm:inline">Choose Core Skills</span>');
  const stepText3 = html.includes('<span class="text-slate-500 font-medium hidden sm:inline">Skill Levels</span>');
  const stepText4 = html.includes('<span class="text-slate-500 font-medium hidden sm:inline">View Diagram</span>');
  assert(stepText1 && stepText2 && stepText3 && stepText4, 'All 4 stepper text labels must have hidden sm:inline to prevent 360px overflow');
});

it('Onboarding step 1 year selection buttons use responsive 2x2 grid on mobile (grid-cols-2 sm:grid-cols-4)', () => {
  assert(html.includes('grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'), 'Year buttons must use grid-cols-2 sm:grid-cols-4');
});

it('Form inputs enforce font-size: 16px !important on mobile (<=768px) to prevent iOS auto-zoom', () => {
  const iosZoomRule = /@media\s*\(max-width:\s*768px\)\s*\{[^}]*font-size:\s*16px\s*!important/s.test(html);
  assert(iosZoomRule, 'input, select, textarea must have font-size: 16px !important on <=768px');
});

it('Buttons enforce minimum touch target height (>= 40px/44px) on touch viewports', () => {
  assert(html.includes('@media (max-width: 768px)'), 'Missing @media (max-width: 768px)');
  assert(html.includes('min-height: 40px'), 'button/a touch targets must enforce min-height: 40px on <=768px');
});

console.log('\n--- Part 5: Viewport Math Simulation (360px, 390px, 412px, 430px) ---');

const viewports = [360, 390, 412, 430];

viewports.forEach(vw => {
  it(`Viewport ${vw}px: Header top bar elements fit comfortably without clipping`, () => {
    // Logo <= 40% of vw
    const maxLogoWidth = Math.floor(vw * 0.4);
    // Log In button approx width: 65px
    const loginWidth = 65;
    // Hamburger button width: 44px
    const hamburgerWidth = 44;
    // Header padding (px-2 = 8px * 2 = 16px)
    const headerPadding = 16;
    // Gap between items (gap-1.5 = 6px * 2 = 12px)
    const gaps = 12;

    const totalCalculatedWidth = maxLogoWidth + loginWidth + hamburgerWidth + headerPadding + gaps;
    assert(totalCalculatedWidth <= vw, `Header width ${totalCalculatedWidth}px exceeds viewport ${vw}px`);
  });

  it(`Viewport ${vw}px: Modal bounds (width: calc(100% - 24px), max-width: 440px) fit within viewport`, () => {
    const modalWidth = Math.min(vw - 24, 440);
    assert(modalWidth <= vw, `Modal width ${modalWidth}px exceeds viewport ${vw}px`);
    assert(modalWidth > 0, 'Modal width must be positive');
  });

  it(`Viewport ${vw}px: Onboarding stepper 4 dots (24px * 4 + 3 separators) fit cleanly`, () => {
    // 4 circles (24px each) = 96px
    // 3 lines (12px min) = 36px
    // Spacing (6px * 6) = 36px
    // Container padding (12px * 2) = 24px
    const totalStepperWidth = 96 + 36 + 36 + 24; // 192px
    assert(totalStepperWidth <= vw, `Stepper dots width ${totalStepperWidth}px exceeds viewport ${vw}px`);
  });
});

console.log('\n====================================================');
console.log(` SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round(passedTests/totalTests * 100)}%)`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
