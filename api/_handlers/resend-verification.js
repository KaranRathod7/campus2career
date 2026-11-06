// POST /api/resend-verification
// Re-issues a fresh 6-digit PIN & activation token and dispatches email via Brevo
const crypto = require('crypto');
const db = require('./db');
const { sendVerificationEmail } = require('./emailService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
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
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    // 1. Check if user exists in database
    let user;
    try {
      user = await db.getUserByEmail(normalizedEmail);
    } catch (err) {
      console.error('[DB Resend Lookup Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to look up account. Please try again.' });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email. Please sign up first.'
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        error: 'This account is already verified. Please log in directly.'
      });
    }

    // 2. Generate fresh 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');

    // 3. Store into pending_verifications in database with 15-minute expiration
    try {
      await db.createPendingVerification(normalizedEmail, pin, token);
    } catch (err) {
      console.error('[DB Resend Insert Error]:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to generate verification code. Please try again.' });
    }

    // 4. Determine Base URL for email verification link
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'campus2career-pi.vercel.app';
    const baseUrl = `${proto}://${host}`;

    console.log(`[CAMPUS2CAREER RESEND PIN]: ${pin} for ${normalizedEmail}`);

    // 5. Send transactional email across available transports
    let emailResult = { success: false, delivered: false };
    try {
      emailResult = await sendVerificationEmail({
        to: normalizedEmail,
        name: user.name || 'Student',
        pin,
        token,
        baseUrl
      });
    } catch (emailErr) {
      console.warn('[Resend Dispatch Warning]:', emailErr.message);
      emailResult = { success: false, delivered: false, error: emailErr.message };
    }

    const isDelivered = Boolean(emailResult && emailResult.delivered);

    return res.status(200).json({
      success: true,
      message: isDelivered
        ? `A fresh 6-digit verification code has been dispatched to ${normalizedEmail}! Please check your Inbox and Spam/Junk folder.`
        : `Fresh verification code generated: ${pin}`,
      email: normalizedEmail,
      delivered: isDelivered,
      pin: isDelivered ? undefined : pin,
      devPin: pin
    });
  } catch (error) {
    console.error('[Resend Verification Error]', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred while resending the code. Please try again.' });
  }
};
