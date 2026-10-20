const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');
const isCrlf = content.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

function replaceSnippet(name, oldSnippet, newSnippet) {
  const normOld = oldSnippet.replace(/\r?\n/g, eol);
  const normNew = newSnippet.replace(/\r?\n/g, eol);

  if (content.includes(normOld)) {
    content = content.replace(normOld, normNew);
    console.log(`[SUCCESS] ${name}`);
    return true;
  } else {
    console.error(`[ERROR] Could not find target for ${name}`);
    return false;
  }
}

// 1. Stream aliases and storage helpers right after STREAM_DATA definition
const target1 = `}
};


// scratch/data_reports_v2.js`;

const replace1 = `}
};

// Stream aliases for flexible normalization
STREAM_DATA.me = STREAM_DATA.mechanical;
STREAM_DATA.mech = STREAM_DATA.mechanical;
STREAM_DATA.ai = STREAM_DATA.aids;
STREAM_DATA.cs = STREAM_DATA.cse;
STREAM_DATA.ee = STREAM_DATA.ece;

function normalizeStreamKey(raw) {
  if (!raw) return 'it';
  const s = String(raw).trim().toLowerCase();
  if (s === 'me' || s === 'mech' || s.includes('mechanical')) return 'mechanical';
  if (s === 'ece' || s === 'ee' || s.includes('electronic')) return 'ece';
  if (s === 'cse' || s === 'cs' || (s.includes('comp') && !s.includes('data'))) return 'cse';
  if (s === 'aids' || s === 'ai' || s.includes('artif') || s.includes('data')) return 'aids';
  if (s === 'it' || s.includes('information')) return 'it';
  if (typeof STREAM_DATA !== 'undefined' && STREAM_DATA[s]) return s;
  return 'it';
}

function clearUserClientStorage() {
  try {
    localStorage.removeItem('c2c_user_analytics');
    localStorage.removeItem('c2c_cached_skills');
    localStorage.removeItem('c2c_session_token');
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_STACK);
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
    localStorage.removeItem(STORAGE_KEY_MCQ);
    localStorage.removeItem(STORAGE_KEY_INVITES);
    localStorage.removeItem('c2c_login_failed_attempts');
    localStorage.removeItem('c2c_login_lockout_until');
    localStorage.removeItem('c2c_active_demo_session');
  } catch (e) {}
  try {
    sessionStorage.clear();
  } catch (e) {}
}
window.clearUserClientStorage = clearUserClientStorage;
window.normalizeStreamKey = normalizeStreamKey;


// scratch/data_reports_v2.js`;

replaceSnippet('Add Stream Aliases & clearUserClientStorage', target1, replace1);

// 2. Storage startup logic with normalized stream and default preset
const target2 = `        const branchKey = (appState.user && appState.user.branch && STREAM_DATA[appState.user.branch])
          ? appState.user.branch
          : (appState.selectedStream || 'it');
        const stream = STREAM_DATA[branchKey] || STREAM_DATA.it;
        const defPreset = (appState.user && appState.user.activeTrackPreset && stream.presets[appState.user.activeTrackPreset])
          ? appState.user.activeTrackPreset
          : (appState.selectedPreset || stream.defaultPreset || 'java_cloud');
        const defSkills = stream.presets[defPreset] ? stream.presets[defPreset].skills : stream.presets.java_cloud.skills;`;

const replace2 = `        const rawBranch = (appState.user && (appState.user.stream || appState.user.branch)) || appState.selectedStream || 'it';
        const branchKey = normalizeStreamKey(rawBranch);
        const stream = STREAM_DATA[branchKey] || STREAM_DATA.it;
        const defPreset = (appState.user && appState.user.activeTrackPreset && stream.presets[appState.user.activeTrackPreset])
          ? appState.user.activeTrackPreset
          : (appState.selectedPreset && stream.presets[appState.selectedPreset]
              ? appState.selectedPreset
              : (stream.defaultPreset || Object.keys(stream.presets)[0]));
        const defSkills = stream.presets[defPreset] ? stream.presets[defPreset].skills : (stream.presets[stream.defaultPreset] ? stream.presets[stream.defaultPreset].skills : (STREAM_DATA.it.presets.java_cloud ? STREAM_DATA.it.presets.java_cloud.skills : []));`;

replaceSnippet('Normalize Stream in Storage Init', target2, replace2);

// 3. getActiveStreamKey
const target3 = `function getActiveStreamKey() {
  if (appState.user && appState.user.branch && STREAM_DATA[appState.user.branch]) {
    return appState.user.branch;
  }
  return appState.selectedStream || 'ece';
}`;

const replace3 = `function getActiveStreamKey() {
  const branch = (appState.user && (appState.user.stream || appState.user.branch)) || appState.selectedStream;
  const normalized = normalizeStreamKey(branch);
  if (STREAM_DATA[normalized]) return normalized;
  return 'it';
}`;

replaceSnippet('Normalize getActiveStreamKey', target3, replace3);

// 4. applyStreamChange
const target4 = `    function applyStreamChange(streamKey, preserveCurrentStack = false) {
      if (!STREAM_DATA[streamKey]) return;
      const stream = STREAM_DATA[streamKey];
      appState.selectedStream = streamKey;`;

const replace4 = `    function applyStreamChange(streamKey, preserveCurrentStack = false) {
      streamKey = normalizeStreamKey(streamKey);
      if (!STREAM_DATA[streamKey]) return;
      const stream = STREAM_DATA[streamKey];
      appState.selectedStream = streamKey;`;

replaceSnippet('Normalize applyStreamChange', target4, replace4);

// 5. switchGlobalStream
const target5 = `    function switchGlobalStream(streamKey, directApply = false) {
      if (!STREAM_DATA[streamKey]) return;

      // Lock stream to profile for logged-in users (demo / unauthenticated only)
      if (appState.user && !appState.user.isGuest) {
        const lockedStream = (appState.user.stream || appState.user.branch || '').toLowerCase();
        if (lockedStream && lockedStream !== 'all' && streamKey !== lockedStream) {
          showToast(\`Stream is locked to your enrolled profile (\${lockedStream.toUpperCase()}).\`);
          return;
        }
      }`;

const replace5 = `    function switchGlobalStream(streamKey, directApply = false) {
      streamKey = normalizeStreamKey(streamKey);
      if (!STREAM_DATA[streamKey]) return;

      // Lock stream to profile for logged-in users (demo / unauthenticated only)
      if (appState.user && !appState.user.isGuest) {
        const lockedStream = normalizeStreamKey(appState.user.stream || appState.user.branch || '');
        if (lockedStream && lockedStream !== 'all' && streamKey !== lockedStream) {
          showToast(\`Stream is locked to your enrolled profile (\${(STREAM_DATA[lockedStream] && STREAM_DATA[lockedStream].shortName) || lockedStream.toUpperCase()}).\`);
          return;
        }
      }`;

replaceSnippet('Normalize switchGlobalStream', target5, replace5);

// 6. openStreamIntakeWizard
const target6 = `    function openStreamIntakeWizard(streamKey) {
      if (!STREAM_DATA[streamKey]) return;
      const stream = STREAM_DATA[streamKey];
      appState.selectedStream = streamKey;`;

const replace6 = `    function openStreamIntakeWizard(streamKey) {
      streamKey = normalizeStreamKey(streamKey);
      if (!STREAM_DATA[streamKey]) return;
      const stream = STREAM_DATA[streamKey];
      appState.selectedStream = streamKey;`;

replaceSnippet('Normalize openStreamIntakeWizard', target6, replace6);

// 7. handleLogout
const target7 = `      // 2. Clear all storages completely
      try {
        localStorage.clear();
      } catch (e) {}
      try {
        sessionStorage.clear();
      } catch (e) {}`;

const replace7 = `      // 2. Clear all storages completely
      clearUserClientStorage();
      try {
        localStorage.clear();
      } catch (e) {}
      try {
        sessionStorage.clear();
      } catch (e) {}`;

replaceSnippet('Integrate clearUserClientStorage in handleLogout', target7, replace7);

// 8. handleAuthSubmit signup
const target8 = `        const role = isRecruiter ? 'recruiter' : 'learner';
        const stream = appState.selectedStream || 'it';

        const submitBtn = document.getElementById('authSubmitBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = \`<span><i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Creating Account &amp; Dispatching Email...</span>\`;
        }

        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password: pass, role, stream })
          });`;

const replace8 = `        const role = isRecruiter ? 'recruiter' : 'learner';
        const navStream = document.getElementById('navStreamSelect') ? document.getElementById('navStreamSelect').value : null;
        const obStream = document.getElementById('obBranch') ? document.getElementById('obBranch').value : null;
        const stream = normalizeStreamKey(appState.selectedStream || obStream || navStream || 'it');

        const submitBtn = document.getElementById('authSubmitBtn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = \`<span><i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Creating Account &amp; Dispatching Email...</span>\`;
        }

        try {
          clearUserClientStorage();
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name, 
              username, 
              email, 
              password: pass, 
              role, 
              stream,
              skills: (Array.isArray(appState.currentStack) && appState.currentStack.length > 0) ? appState.currentStack : null
            })
          });`;

replaceSnippet('Integrate clearUserClientStorage and stream in signup', target8, replace8);

// 9. handleAuthSubmit sign in success
const target9 = `          // Credentials Correct: Reset failed attempt counters
          localStorage.removeItem('c2c_login_failed_attempts');
          localStorage.removeItem('c2c_login_lockout_until');

          const foundUser = data.user;
          appState.user = foundUser;
          appState.selectedStream = (foundUser.stream || foundUser.branch || 'it').toLowerCase();`;

const replace9 = `          // Credentials Correct: Reset failed attempt counters
          clearUserClientStorage();

          const foundUser = data.user;
          appState.user = foundUser;
          appState.selectedStream = normalizeStreamKey(foundUser.stream || foundUser.branch || 'it');`;

replaceSnippet('Integrate clearUserClientStorage in sign in', target9, replace9);

// 10. verifyAndCompleteRegistration
const target10 = `        stopVerificationPolling();
        localStorage.removeItem('c2c_login_failed_attempts');
        localStorage.removeItem('c2c_login_lockout_until');

        const verifiedUser = data.user || {
          id: 'user-' + Date.now(),
          name: pendingRegistrationUser.name || 'User',
          email: pendingRegistrationUser.email,
          role: pendingRegistrationUser.role || 'learner',
          stream: pendingRegistrationUser.stream || null,
          branch: pendingRegistrationUser.stream || null,
          skills: null,
          is_verified: true
        };

        appState.user = verifiedUser;
        appState.selectedStream = (verifiedUser.stream || verifiedUser.branch || 'it').toLowerCase();`;

const replace10 = `        stopVerificationPolling();
        clearUserClientStorage();

        const verifiedUser = data.user || {
          id: 'user-' + Date.now(),
          name: pendingRegistrationUser.name || 'User',
          email: pendingRegistrationUser.email,
          role: pendingRegistrationUser.role || 'learner',
          stream: normalizeStreamKey(pendingRegistrationUser.stream || 'it'),
          branch: normalizeStreamKey(pendingRegistrationUser.stream || 'it'),
          skills: null,
          is_verified: true
        };

        appState.user = verifiedUser;
        appState.selectedStream = normalizeStreamKey(verifiedUser.stream || verifiedUser.branch || 'it');`;

replaceSnippet('Integrate clearUserClientStorage in verifyAndCompleteRegistration', target10, replace10);

// 11. startVerificationPolling
const target11 = `            // Stop polling immediately upon verification
            stopVerificationPolling();
            const verifiedUser = data.user;
            appState.user = verifiedUser;
            appState.selectedStream = (verifiedUser.stream || verifiedUser.branch || 'it').toLowerCase();`;

const replace11 = `            // Stop polling immediately upon verification
            stopVerificationPolling();
            clearUserClientStorage();
            const verifiedUser = data.user;
            appState.user = verifiedUser;
            appState.selectedStream = normalizeStreamKey(verifiedUser.stream || verifiedUser.branch || 'it');`;

replaceSnippet('Integrate clearUserClientStorage in startVerificationPolling', target11, replace11);

// Write updated file
fs.writeFileSync(htmlPath, content, 'utf8');
console.log('[COMPLETE] Updated index.html successfully');
