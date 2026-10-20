// POST /api/auth/reset-password
// Verifies 6-digit OTP and securely updates user password
const bcrypt = require('bcryptjs');
const db = require('./db');

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
    const { email, code, newPassword } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();
    const cleanPassword = (newPassword || '').trim();

    if (!normalizedEmail || !cleanCode) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long.' });
    }

    // Hash new password securely
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // Verify OTP and update password
    const result = await db.verifyAndUsePasswordReset(normalizedEmail, cleanCode, hashedPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired verification code. Please request a new code.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in.'
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
