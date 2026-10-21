// POST /api/auth/forgot-password
// Dispatches 6-digit OTP for password recovery with 5-min expiry and 60s cooldown
const db = require('./db');
const { sendPasswordResetOtpEmail } = require('./emailService');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { email } = req.body || {};
    // Sanitize Inputs
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    console.log(`[RESET ATTEMPT] Initiating OTP send for: ${cleanEmail}`);

    // 1. Check if user exists (case-insensitive)
    let user;
    try {
      user = await db.getUserByEmail(cleanEmail);
    } catch (err) {
      console.error('[DB Forgot Password Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Database error occurred. Please try again later.' });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found matching this email address.'
      });
    }

    // 2. Prepare 6-digit OTP & 5-minute expiry
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const supabase = db.getSupabaseClient();
    if (supabase) {
      // Check 60-Second Cooldown on Server:
      // Query password_resets for any code generated for cleanEmail in the last 60 seconds
      const { data: recentCode } = await supabase
        .from('password_resets')
        .select('created_at')
        .ilike('email', cleanEmail)
        .gt('created_at', new Date(Date.now() - 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();

      if (recentCode) {
        return res.status(429).json({ success: false, error: 'Please wait before requesting another code.' });
      }

      // Purge Old Codes for This Email:
      // Delete any existing rows for this email before inserting a new one
      await supabase.from('password_resets').delete().ilike('email', cleanEmail);

      // Insert New OTP with Strict 5-Minute Validity & Reset Attempt Counter:
      const { error: insertError } = await supabase
        .from('password_resets')
        .insert([{
          email: cleanEmail,
          token: String(resetCode).trim(),
          expires_at: expiresAt,
          attempts: 0
        }]);

      if (insertError) {
        console.error('FATAL: Error inserting OTP into password_resets:', insertError);
        return res.status(500).json({ success: false, error: 'Database failed to store OTP.' });
      }
    } else {
      // Fallback path when Supabase client is not directly configured (PostgreSQL pool / local store)
      const isRateLimited = await db.checkPasswordResetCooldown(cleanEmail, 60);
      if (isRateLimited) {
        return res.status(429).json({ success: false, error: 'Please wait before requesting another code.' });
      }
      await db.purgePasswordResets(cleanEmail);
      await db.createPasswordReset(cleanEmail, resetCode, new Date(expiresAt));
    }

    // Immediate Server Console OTP Output (Testing Fallback)
    console.log('==============================================');
    console.log(`[PASSWORD RESET CODE]: ${resetCode} FOR ${cleanEmail} (Valid for 5 mins)`);
    console.log('==============================================');

    // 4. Dispatch OTP via email service with comprehensive logging and error handling
    try {
      const emailResult = await sendPasswordResetOtpEmail({
        to: cleanEmail,
        name: user.name || 'Student',
        code: resetCode
      });

      if (!emailResult || emailResult.success === false) {
        const errorObj = {
          message: (emailResult && emailResult.error) || 'Failed to dispatch email via provider',
          recipient: cleanEmail,
          raw: emailResult
        };
        console.error('[EMAIL DISPATCH FAILURE]:', JSON.stringify(errorObj, null, 2));
        return res.status(500).json({
          success: false,
          error: 'Email service error: ' + errorObj.message,
          devOtp: resetCode
        });
      }
    } catch (emailErr) {
      const errorObj = {
        message: emailErr.message || 'Unhandled error during email dispatch',
        stack: emailErr.stack,
        recipient: cleanEmail
      };
      console.error('[EMAIL DISPATCH FAILURE]:', JSON.stringify(errorObj, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Email service error: ' + errorObj.message,
        devOtp: resetCode
      });
    }

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your inbox and spam folder.`,
      devOtp: resetCode
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
