with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Insert deviceBVerifiedModal if not already present
if 'id="deviceBVerifiedModal"' not in text:
    idx = text.find('id="authModal"')
    div_count = 0
    found_end = -1
    for i in range(idx, len(text)):
        if text[i:i+4] == '<div':
            div_count += 1
        elif text[i:i+6] == '</div>':
            div_count -= 1
            if div_count == 0:
                found_end = i + 6
                break

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
    text = text[:found_end] + device_b_modal_html + text[found_end:]
    print("1. Inserted deviceBVerifiedModal right after authModal.")

# 2. Add stopVerificationPolling() inside closeAuthModal()
old_cam = "function closeAuthModal() {\n      const modal = document.getElementById('authModal');"
new_cam = "function closeAuthModal() {\n      stopVerificationPolling();\n      const modal = document.getElementById('authModal');"
if old_cam in text:
    text = text.replace(old_cam, new_cam, 1)
    print("2. Added stopVerificationPolling() into closeAuthModal().")
else:
    print("Warning: old_cam not found.")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Insertion finished successfully.")
