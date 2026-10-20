import sys

def apply_progressive_enter_nav():
    path = 'index.html'
    with open(path, 'rb') as f:
        data = f.read().decode('utf-8')

    crlf = '\r\n' in data

    # 1. Update #authStandardFields
    t1 = '<div id="authStandardFields" class="space-y-3">'
    r1 = '<div id="authStandardFields" class="space-y-3" onkeydown="handleFormEnterKey(event, this, \'#authSubmitBtn\')">'
    if crlf:
        t1 = t1.replace('\n', '\r\n')
        r1 = r1.replace('\n', '\r\n')
    if t1 in data:
        data = data.replace(t1, r1, 1)
        print("[OK] Updated #authStandardFields with onkeydown")
    else:
        print("! t1 not found")

    # 2. Update #authVerifyStep & add ID to its submit button
    t2 = """        <!-- Sign Up Verification Step (Code sent to real Email / Campus2Career Mailbox) -->
        <div id="authVerifyStep" class="hidden space-y-4">"""
    r2 = """        <!-- Sign Up Verification Step (Code sent to real Email / Campus2Career Mailbox) -->
        <div id="authVerifyStep" class="hidden space-y-4" onkeydown="handleFormEnterKey(event, this, '#authVerifySubmitBtn')">"""
    if crlf:
        t2 = t2.replace('\n', '\r\n')
        r2 = r2.replace('\n', '\r\n')
    if t2 in data:
        data = data.replace(t2, r2, 1)
        print("[OK] Updated #authVerifyStep container with onkeydown")
    else:
        print("! t2 not found")

    t2_btn = """          <button type="button" onclick="verifyAndCompleteRegistration()" class="w-full py-3 bg-[#008080] hover:bg-[#006666] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5">
            <span>Verify &amp; Create Account &rarr;</span>
          </button>"""
    r2_btn = """          <button type="button" id="authVerifySubmitBtn" onclick="verifyAndCompleteRegistration()" class="w-full py-3 bg-[#008080] hover:bg-[#006666] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5">
            <span>Verify &amp; Create Account &rarr;</span>
          </button>"""
    if crlf:
        t2_btn = t2_btn.replace('\n', '\r\n')
        r2_btn = r2_btn.replace('\n', '\r\n')
    if t2_btn in data:
        data = data.replace(t2_btn, r2_btn, 1)
        print("[OK] Added #authVerifySubmitBtn id to verify button")
    else:
        print("! t2_btn not found")

    # 3. Update #authForgotPanel and add IDs to buttons
    t3 = """        <!-- Forgot Password Email Reset Panel -->
        <div id="authForgotPanel" class="hidden space-y-3">"""
    r3 = """        <!-- Forgot Password Email Reset Panel -->
        <div id="authForgotPanel" class="hidden space-y-3" onkeydown="handleFormEnterKey(event, this, (document.getElementById('forgotOtpSection') && !document.getElementById('forgotOtpSection').classList.contains('hidden')) ? '#forgotResetSubmitBtn' : '#forgotSendCodeBtn')">"""
    if crlf:
        t3 = t3.replace('\n', '\r\n')
        r3 = r3.replace('\n', '\r\n')
    if t3 in data:
        data = data.replace(t3, r3, 1)
        print("[OK] Updated #authForgotPanel container with onkeydown")
    else:
        print("! t3 not found")

    t3_btn1 = '<button type="button" onclick="sendPasswordResetEmail()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap">Send Code</button>'
    r3_btn1 = '<button type="button" id="forgotSendCodeBtn" onclick="sendPasswordResetEmail()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap">Send Code</button>'
    if t3_btn1 in data:
        data = data.replace(t3_btn1, r3_btn1, 1)
        print("[OK] Added #forgotSendCodeBtn id")
    else:
        print("! t3_btn1 not found")

    t3_btn2 = """            <button type="button" onclick="verifyAndResetPassword()" class="w-full py-2.5 bg-[#008080] hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md transition-all">
              Save New Password &amp; Log In &rarr;
            </button>"""
    r3_btn2 = """            <button type="button" id="forgotResetSubmitBtn" onclick="verifyAndResetPassword()" class="w-full py-2.5 bg-[#008080] hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-md transition-all">
              Save New Password &amp; Log In &rarr;
            </button>"""
    if crlf:
        t3_btn2 = t3_btn2.replace('\n', '\r\n')
        r3_btn2 = r3_btn2.replace('\n', '\r\n')
    if t3_btn2 in data:
        data = data.replace(t3_btn2, r3_btn2, 1)
        print("[OK] Added #forgotResetSubmitBtn id")
    else:
        print("! t3_btn2 not found")

    # 4. Update #wizardStep1
    t4 = """        <!-- STEP 1: Academic Profile & Stream -->
        <div id="wizardStep1" class="wizard-pane block space-y-4">"""
    r4 = """        <!-- STEP 1: Academic Profile & Stream -->
        <div id="wizardStep1" class="wizard-pane block space-y-4" onkeydown="handleFormEnterKey(event, this, '#wizardNextBtn')">"""
    if crlf:
        t4 = t4.replace('\n', '\r\n')
        r4 = r4.replace('\n', '\r\n')
    if t4 in data:
        data = data.replace(t4, r4, 1)
        print("[OK] Updated #wizardStep1 container with onkeydown")
    else:
        print("! t4 not found")

    # 5. Update #adminAuthModal form body & clean adminSecretKeyInput onkeydown
    t5 = """      <!-- Shield Form Body -->
      <div class="p-6 space-y-4">"""
    r5 = """      <!-- Shield Form Body -->
      <div class="p-6 space-y-4" onkeydown="handleFormEnterKey(event, this, '#adminVerifyBtn')">"""
    if crlf:
        t5 = t5.replace('\n', '\r\n')
        r5 = r5.replace('\n', '\r\n')
    if t5 in data:
        data = data.replace(t5, r5, 1)
        print("[OK] Updated #adminAuthModal form body with onkeydown")
    else:
        print("! t5 not found")

    t5_input = '<input type="password" id="adminSecretKeyInput" onkeydown="if(event.key === \'Enter\') verifyAdminPasscode()"'
    r5_input = '<input type="password" id="adminSecretKeyInput"'
    if t5_input in data:
        data = data.replace(t5_input, r5_input, 1)
        print("[OK] Cleaned adminSecretKeyInput inline onkeydown in favor of handleFormEnterKey")
    else:
        print("! t5_input not found")

    # 6. Add handleFormEnterKey and initProgressiveFormNavigation JS implementation
    t6_marker = """    /* ========================================================================= */
    /* USER DATABASE MANAGEMENT & AUTHENTICATION ENGINE                          */
    /* ========================================================================= */"""
    
    js_code = """    /* ========================================================================= */
    /* PROGRESSIVE ENTER-KEY FORM NAVIGATION & FINAL SUBMISSION                  */
    /* ========================================================================= */
    function handleFormEnterKey(event, formElement, submitButtonSelector) {
      if (!event || event.key !== 'Enter' || event.shiftKey) return;

      // Do not override multiline textarea behavior
      if (event.target && event.target.tagName && event.target.tagName.toLowerCase() === 'textarea') return;

      const container = (typeof formElement === 'string') ? document.querySelector(formElement) : formElement;
      if (!container) return;

      const focusableSelectors = 'input:not([type="hidden"]):not([disabled]), select:not([disabled])';
      const rawInputs = Array.from(container.querySelectorAll(focusableSelectors));

      // Only consider visible inputs (not hidden and not inside a .hidden container)
      const inputs = rawInputs.filter(el => {
        if (el.closest('.hidden')) return false;
        if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') return false;
        return true;
      });

      const currentIndex = inputs.indexOf(event.target);

      if (currentIndex > -1) {
        event.preventDefault();

        // If there is another input field down the list, smoothly advance focus to it
        if (currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
        } else {
          // On the final input field, programmatically trigger the submission action
          let submitBtn = null;
          if (typeof submitButtonSelector === 'string') {
            submitBtn = container.querySelector(submitButtonSelector) || document.querySelector(submitButtonSelector);
          } else if (submitButtonSelector && typeof submitButtonSelector.click === 'function') {
            submitBtn = submitButtonSelector;
          }

          if (!submitBtn) {
            submitBtn = container.querySelector('button[type="submit"]') || container.querySelector('button:not([disabled])');
          }

          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
          }
        }
      }
    }
    window.handleFormEnterKey = handleFormEnterKey;

    function initProgressiveFormNavigation() {
      document.addEventListener('keydown', function(event) {
        if (!event || event.key !== 'Enter' || event.shiftKey) return;
        if (!event.target || event.target.tagName.toLowerCase() === 'textarea') return;
        if (event.target.tagName.toLowerCase() !== 'input' && event.target.tagName.toLowerCase() !== 'select') return;

        // Skip if already handled by inline onkeydown
        if (event.defaultPrevented) return;

        // 1. Auth Standard Fields (Sign Up & Log In)
        const authStandard = document.getElementById('authStandardFields');
        if (authStandard && authStandard.contains(event.target) && !authStandard.closest('.hidden')) {
          handleFormEnterKey(event, authStandard, '#authSubmitBtn');
          return;
        }

        // 2. Auth Verification Step (PIN / Email confirmation code)
        const authVerify = document.getElementById('authVerifyStep');
        if (authVerify && authVerify.contains(event.target) && !authVerify.closest('.hidden')) {
          handleFormEnterKey(event, authVerify, '#authVerifySubmitBtn');
          return;
        }

        // 3. Auth Forgot Password Panel
        const authForgot = document.getElementById('authForgotPanel');
        if (authForgot && authForgot.contains(event.target) && !authForgot.closest('.hidden')) {
          const otpSection = document.getElementById('forgotOtpSection');
          const submitSelector = (otpSection && !otpSection.classList.contains('hidden'))
            ? '#forgotResetSubmitBtn'
            : '#forgotSendCodeBtn';
          handleFormEnterKey(event, authForgot, submitSelector);
          return;
        }

        // 4. Admin Auth Modal
        const adminModal = document.getElementById('adminAuthModal');
        if (adminModal && adminModal.contains(event.target) && !adminModal.closest('.hidden')) {
          handleFormEnterKey(event, adminModal, '#adminVerifyBtn');
          return;
        }

        // 5. Wizard Step 1 (Onboarding Profile & Stream)
        const wizardStep1 = document.getElementById('wizardStep1');
        if (wizardStep1 && wizardStep1.contains(event.target) && !wizardStep1.closest('.hidden')) {
          handleFormEnterKey(event, wizardStep1, '#wizardNextBtn');
          return;
        }

        // 6. Generic Form Fallback
        const parentForm = event.target.closest('form') || event.target.closest('.modal-pane') || event.target.closest('[role="dialog"]');
        if (parentForm) {
          handleFormEnterKey(event, parentForm);
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initProgressiveFormNavigation);
    } else {
      initProgressiveFormNavigation();
    }

    /* ========================================================================= */
    /* USER DATABASE MANAGEMENT & AUTHENTICATION ENGINE                          */
    /* ========================================================================= */"""

    if crlf:
        t6_marker = t6_marker.replace('\n', '\r\n')
        js_code = js_code.replace('\n', '\r\n')

    if t6_marker in data:
        data = data.replace(t6_marker, js_code, 1)
        print("[OK] Added handleFormEnterKey and initProgressiveFormNavigation to JS")
    else:
        print("! t6_marker not found")

    with open(path, 'wb') as f:
        f.write(data.encode('utf-8'))
    print("Completed progressive enter form navigation overhaul in index.html!")

if __name__ == '__main__':
    apply_progressive_enter_nav()
