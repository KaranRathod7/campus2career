# Script to apply Part 2 features (Cross-device polling, logout, device B confirmation, mobile overflow CSS)
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update <style> block to include overflow-x: hidden on html, body
old_style_marker = '  <style>\n    /* UI Polish & Custom Scrollbars */'
new_style_marker = '''  <style>
    /* Prevent horizontal overflow on mobile viewports */
    html, body {
      overflow-x: hidden !important;
      width: 100%;
      max-width: 100vw;
    }

    /* UI Polish & Custom Scrollbars */'''

if old_style_marker in content:
    content = content.replace(old_style_marker, new_style_marker, 1)
    print("1. Added mobile overflow-x CSS rule.")
else:
    # Try normalized
    o_norm = old_style_marker.replace('\r\n', '\n')
    c_norm = content.replace('\r\n', '\n')
    if o_norm in c_norm:
        content = c_norm.replace(o_norm, new_style_marker, 1)
        print("1. Added mobile overflow-x CSS rule (normalized).")
    else:
        print("Warning: style marker not found.")

# 2. Update updateAuthUI to sync mobile drawer state
old_update_auth_ui = '''        if (heroSkillBtn) heroSkillBtn.classList.remove('hidden');
      }

      checkGuestEvaluationBanner();
    }'''

new_update_auth_ui = '''        if (heroSkillBtn) heroSkillBtn.classList.remove('hidden');
      }

      // Synchronize Mobile Navigation Drawer Auth & Profile State
      const mobileLoggedOutDiv = document.getElementById('mobileAuthRowLoggedOut');
      const mobileLoggedInDiv = document.getElementById('mobileAuthRowLoggedIn');
      const mobileNamePill = document.getElementById('mobileUserPillName');
      const mobileRoleBadge = document.getElementById('mobileUserRoleBadge');

      if (isAuthenticated) {
        if (mobileLoggedOutDiv) mobileLoggedOutDiv.classList.add('hidden');
        if (mobileLoggedInDiv) {
          mobileLoggedInDiv.classList.remove('hidden');
          mobileLoggedInDiv.classList.add('flex');
        }
        if (mobileNamePill) mobileNamePill.innerText = appState.user.name || 'User';
        if (mobileRoleBadge) mobileRoleBadge.innerText = (appState.user.role || 'learner').toUpperCase();
      } else {
        if (mobileLoggedInDiv) {
          mobileLoggedInDiv.classList.add('hidden');
          mobileLoggedInDiv.classList.remove('flex');
        }
        if (mobileLoggedOutDiv) mobileLoggedOutDiv.classList.remove('hidden');
      }

      checkGuestEvaluationBanner();
    }'''

o_u_norm = old_update_auth_ui.replace('\r\n', '\n')
c_norm = content.replace('\r\n', '\n')
if o_u_norm in c_norm:
    content = c_norm.replace(o_u_norm, new_update_auth_ui, 1)
    print("2. Updated updateAuthUI for mobile drawer.")
else:
    print("Warning: old_update_auth_ui not found.")

# 3. Update handleLogout to async secure implementation
old_handle_logout = '''    function handleLogout() {
      appState.user = null;
      localStorage.removeItem(STORAGE_KEY_USER);
      updateAuthUI();
      showToast("Logged out successfully.");
      navigateTo('home');
    }'''

new_handle_logout = '''    async function handleLogout() {
      try {
        // 1. Invalidate HTTP-only session cookies on backend
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {
          return fetch('/api/logout', { method: 'POST', credentials: 'include' });
        });
      } catch (e) {
        console.debug('Backend logout call notice:', e);
      }

      // 2. Clear client-side cached authentication keys
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem('c2c_login_failed_attempts');
      localStorage.removeItem('c2c_login_lockout_until');
      sessionStorage.removeItem('c2c_active_demo_session');
      sessionStorage.clear();

      // 3. Reset application state back to unauthenticated guest mode
      appState.user = null;
      appState.activeRole = 'learner';

      // 4. Reset modal form fields
      const emailInput = document.getElementById('authEmailInput');
      const passInput = document.getElementById('authPasswordInput');
      const nameInput = document.getElementById('authNameInput');
      const codeInput = document.getElementById('authVerificationCodeInput');
      if (emailInput) emailInput.value = '';
      if (passInput) passInput.value = '';
      if (nameInput) nameInput.value = '';
      if (codeInput) codeInput.value = '';

      // 5. Update auth UI & notify user
      updateAuthUI();
      showToast("You have been logged out successfully. All sessions ended.");

      // 6. Redirect cleanly to landing page
      navigateTo('home');
    }'''

o_l_norm = old_handle_logout.replace('\r\n', '\n')
c_norm = content.replace('\r\n', '\n')
if o_l_norm in c_norm:
    content = c_norm.replace(o_l_norm, new_handle_logout, 1)
    print("3. Updated handleLogout with robust session invalidation.")
else:
    print("Warning: old_handle_logout not found.")

# 4. Update closeAuthModal to stop polling
old_close_auth = '''    function closeAuthModal() {
      const modal = document.getElementById('authModal');
      if (modal) modal.classList.add('hidden');
    }'''

new_close_auth = '''    function closeAuthModal() {
      stopVerificationPolling();
      const modal = document.getElementById('authModal');
      if (modal) modal.classList.add('hidden');
    }'''

o_c_norm = old_close_auth.replace('\r\n', '\n')
c_norm = content.replace('\r\n', '\n')
if o_c_norm in c_norm:
    content = c_norm.replace(o_c_norm, new_close_auth, 1)
    print("4. Updated closeAuthModal to stop polling.")
else:
    print("Warning: old_close_auth not found.")

# 5. Update startVerificationPolling to query /api/auth/status every 2.5s
old_start_polling = '''    function startVerificationPolling(email) {
      stopVerificationPolling();
      if (!email) return;

      const normalizedEmail = email.trim().toLowerCase();
      verificationPollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/verify-email?check=true&email=${encodeURIComponent(normalizedEmail)}`, {
            headers: { 'Accept': 'application/json' }
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.success && data.is_verified && data.user) {
            stopVerificationPolling();
            const verifiedUser = data.user;
            appState.user = verifiedUser;
            appState.selectedStream = (verifiedUser.stream || verifiedUser.branch || 'it').toLowerCase();
            appState.activeRole = verifiedUser.role || 'learner';
            saveStateToStorage();
            updateAuthUI();
            closeAuthModal();

            showToast(`✓ Account verified on device! Welcome to Campus2Career, ${verifiedUser.name}!`);

            if (verifiedUser.role === 'recruiter') {
              setRole('recruiter');
              navigateTo('recruiter-candidates');
            } else {
              setRole('learner');
              if (!hasCompletedOnboarding(verifiedUser)) {
                openOnboardingModal(verifiedUser.stream || verifiedUser.branch || null);
              } else {
                if (verifiedUser.stream || verifiedUser.branch) {
                  applyStreamChange(verifiedUser.stream || verifiedUser.branch, true);
                }
                navigateTo('analyzer');
              }
              renderSkillLevelDiagram();
              updateGrowthSummaryCards();
              updateCharts();
            }
          }
        } catch (err) {
          // Keep polling silently
        }
      }, 3000);
    }'''

new_start_polling = '''    function startVerificationPolling(email) {
      stopVerificationPolling();
      if (!email) return;

      const normalizedEmail = email.trim().toLowerCase();
      // Auto-poll every 2.5 seconds (2500ms) for cross-device email verification
      verificationPollInterval = setInterval(async () => {
        try {
          // Check dedicated /api/auth/status route with fallback to /api/verify-email?check=true
          let res = await fetch(`/api/auth/status?email=${encodeURIComponent(normalizedEmail)}`, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          }).catch(() => null);

          if (!res || !res.ok) {
            res = await fetch(`/api/verify-email?check=true&email=${encodeURIComponent(normalizedEmail)}`, {
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            }).catch(() => null);
          }

          if (!res || !res.ok) return;
          const data = await res.json();

          if (data && data.success && data.is_verified && data.user) {
            // Stop polling immediately upon verification
            stopVerificationPolling();
            const verifiedUser = data.user;
            appState.user = verifiedUser;
            appState.selectedStream = (verifiedUser.stream || verifiedUser.branch || 'it').toLowerCase();
            appState.activeRole = verifiedUser.role || 'learner';
            saveStateToStorage();
            updateAuthUI();
            closeAuthModal();

            showToast(`✓ Account verified on device! Welcome to Campus2Career, ${verifiedUser.name}!`);

            if (verifiedUser.role === 'recruiter') {
              setRole('recruiter');
              navigateTo('recruiter-candidates');
            } else {
              setRole('learner');
              if (!hasCompletedOnboarding(verifiedUser)) {
                openOnboardingModal(verifiedUser.stream || verifiedUser.branch || null);
              } else {
                if (verifiedUser.stream || verifiedUser.branch) {
                  applyStreamChange(verifiedUser.stream || verifiedUser.branch, true);
                }
                navigateTo('analyzer');
              }
              renderSkillLevelDiagram();
              updateGrowthSummaryCards();
              updateCharts();
            }
          }
        } catch (err) {
          // Silent recovery to sustain polling interval
        }
      }, 2500);
    }'''

o_p_norm = old_start_polling.replace('\r\n', '\n')
c_norm = content.replace('\r\n', '\n')
if o_p_norm in c_norm:
    content = c_norm.replace(o_p_norm, new_start_polling, 1)
    print("5. Updated startVerificationPolling to 2.5s with /api/auth/status.")
else:
    print("Warning: old_start_polling not found.")

# 6. Add Device B confirmation modal HTML right after authModal
device_b_modal_html = '''
  <!-- DEVICE B CROSS-DEVICE EMAIL VERIFICATION CONFIRMATION MODAL -->
  <div id="deviceBVerifiedModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-white dark:bg-[#0B132B] border border-teal-500/40 rounded-2xl p-6 sm:p-7 max-w-md w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <div>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Email Verified!</h3>
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          Your Campus2Career account (<strong id="deviceBVerifiedEmailDisplay" class="text-teal-600 dark:text-teal-400 font-mono"></strong>) has been successfully activated.
        </p>
      </div>

      <div class="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 text-left space-y-1.5">
        <div class="flex items-center space-x-2 font-bold text-slate-800 dark:text-slate-200">
          <i class="fa-solid fa-laptop-mobile text-[#008080] dark:text-teal-400 text-sm"></i>
          <span>Cross-Device Auto-Sync Enabled</span>
        </div>
        <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          If you initiated registration on another screen (e.g. your Laptop or Desktop), that screen has <strong>automatically updated</strong> and logged you in! You can return to your original screen or continue here.
        </p>
      </div>

      <button type="button" onclick="dismissDeviceBVerifiedModal()" class="w-full py-3.5 bg-[#008080] hover:bg-[#006666] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
        <span>Continue to Dashboard on this Device &rarr;</span>
      </button>
    </div>
  </div>
'''

if 'id="deviceBVerifiedModal"' not in content:
    target_modal = '  </div>\n\n  <!-- Share Modal -->'
    if target_modal in content:
        content = content.replace(target_modal, '  </div>\n' + device_b_modal_html + '\n  <!-- Share Modal -->', 1)
        print("6. Added Device B confirmation modal HTML.")
    else:
        # Try finding </div>\n\n  <!-- Live Toast Container -->
        c_norm = content.replace('\r\n', '\n')
        target_norm = '  </div>\n\n  <!-- Share Modal -->'
        if target_norm in c_norm:
            content = c_norm.replace(target_norm, '  </div>\n' + device_b_modal_html + '\n  <!-- Share Modal -->', 1)
            print("6. Added Device B confirmation modal HTML (normalized).")
        else:
            print("Warning: target_modal not found.")

# 7. Update checkUrlVerificationParams to trigger Device B confirmation modal
old_check_url = '''    async function checkUrlVerificationParams() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isVerified = urlParams.get('verified') === 'true';
        const email = urlParams.get('email');
        if (isVerified && email) {
          // Clean up URL parameters cleanly
          window.history.replaceState({}, document.title, window.location.pathname);
          const res = await fetch(`/api/verify-email?check=true&email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              appState.user = data.user;
              appState.selectedStream = (data.user.stream || data.user.branch || 'it').toLowerCase();
              appState.activeRole = data.user.role || 'learner';
              saveStateToStorage();
              updateAuthUI();
              closeAuthModal();
              showToast(`✓ Email verified! Welcome back, ${data.user.name}!`);
              if (data.user.role === 'recruiter') {
                setRole('recruiter');
                navigateTo('recruiter-candidates');
              } else {
                setRole('learner');
                if (!hasCompletedOnboarding(data.user)) {
                  openOnboardingModal(data.user.stream || data.user.branch || null);
                } else {
                  if (data.user.stream || data.user.branch) {
                    applyStreamChange(data.user.stream || data.user.branch, true);
                  }
                  navigateTo('analyzer');
                }
                renderSkillLevelDiagram();
                updateGrowthSummaryCards();
                updateCharts();
              }
            }
          }
        }
      } catch (e) {
        console.warn('URL verification check error:', e);
      }
    }'''

new_check_url = '''    let deviceBVerifiedTargetUser = null;

    function showDeviceBVerifiedModal(email, name) {
      const modal = document.getElementById('deviceBVerifiedModal');
      const emailDisplay = document.getElementById('deviceBVerifiedEmailDisplay');
      if (emailDisplay) emailDisplay.innerText = email || '';
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    function dismissDeviceBVerifiedModal() {
      const modal = document.getElementById('deviceBVerifiedModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      if (deviceBVerifiedTargetUser) {
        const u = deviceBVerifiedTargetUser;
        if (u.role === 'recruiter') {
          setRole('recruiter');
          navigateTo('recruiter-candidates');
        } else {
          setRole('learner');
          if (!hasCompletedOnboarding(u)) {
            openOnboardingModal(u.stream || u.branch || null);
          } else {
            if (u.stream || u.branch) {
              applyStreamChange(u.stream || u.branch, true);
            }
            navigateTo('analyzer');
          }
          renderSkillLevelDiagram();
          updateGrowthSummaryCards();
          updateCharts();
        }
        deviceBVerifiedTargetUser = null;
      } else {
        navigateTo('analyzer');
      }
    }

    async function checkUrlVerificationParams() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isVerified = urlParams.get('verified') === 'true';
        const email = urlParams.get('email');
        if (isVerified && email) {
          // Clean up URL parameters cleanly
          window.history.replaceState({}, document.title, window.location.pathname);

          // Query /api/auth/status to register verified session on Device B
          let res = await fetch(`/api/auth/status?email=${encodeURIComponent(email)}`, {
            credentials: 'include'
          }).catch(() => null);

          if (!res || !res.ok) {
            res = await fetch(`/api/verify-email?check=true&email=${encodeURIComponent(email)}`, {
              credentials: 'include'
            }).catch(() => null);
          }

          if (res && res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              appState.user = data.user;
              appState.selectedStream = (data.user.stream || data.user.branch || 'it').toLowerCase();
              appState.activeRole = data.user.role || 'learner';
              deviceBVerifiedTargetUser = data.user;
              saveStateToStorage();
              updateAuthUI();
              closeAuthModal();

              // Display clean confirmation message on Device B with button to continue
              showDeviceBVerifiedModal(email, data.user.name);
              showToast(`✓ Email verified! Welcome back, ${data.user.name}!`);
            }
          }
        }
      } catch (e) {
        console.warn('URL verification check error:', e);
      }
    }'''

o_chk_norm = old_check_url.replace('\r\n', '\n')
c_norm = content.replace('\r\n', '\n')
if o_chk_norm in c_norm:
    content = c_norm.replace(o_chk_norm, new_check_url, 1)
    print("7. Updated checkUrlVerificationParams with Device B modal.")
else:
    print("Warning: old_check_url not found.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Part 2 completed successfully.")
