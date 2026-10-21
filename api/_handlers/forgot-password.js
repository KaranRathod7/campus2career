// POST /api/auth/forgot-password
// Dispatches 6-digit OTP for password recovery
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
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    console.log(`[RESET ATTEMPT] Initiating OTP send for: ${normalizedEmail}`);

    // 1. Check if user exists (case-insensitive)
    let user;
    try {
      user = await db.getUserByEmail(normalizedEmail);
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

    // 2. Generate secure 6-digit OTP
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 3. Store OTP in database (invalidating previous codes)
    await db.createPasswordReset(normalizedEmail, resetCode, expiresAt);

    // Immediate Server Console OTP Output (Testing Fallback)
    console.log('==============================================');
    console.log(`[PASSWORD RESET CODE]: ${resetCode} FOR ${normalizedEmail}`);
    console.log('==============================================');

    // 4. Dispatch OTP via email service with comprehensive logging and error handling
    try {
      const emailResult = await sendPasswordResetOtpEmail({
        to: normalizedEmail,
        name: user.name || 'Student',
        code: resetCode
      });

      if (!emailResult || emailResult.success === false) {
        const errorObj = {
          message: (emailResult && emailResult.error) || 'Failed to dispatch email via provider',
          recipient: normalizedEmail,
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
        recipient: normalizedEmail
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
      message: `Verification code sent to ${normalizedEmail}. Please check your inbox and spam folder.`,
      devOtp: resetCode
    });
  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
