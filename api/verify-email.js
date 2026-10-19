// GET /api/verify-email?token=<TOKEN>&email=<EMAIL>
// One-click email verification link handler & manual validator
const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET Request: 1-Click Link from Brevo email
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost:8000'}`);
      const token = url.searchParams.get('token');
      const email = url.searchParams.get('email');

      if (!token || !email) {
        return res.writeHead(302, { Location: '/signup?error=invalid_token' }).end();
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Validate matching token and email against pending_verifications where expires_at > NOW()
      const pending = await db.getPendingVerification(normalizedEmail, token);

      if (!pending) {
        // Expired or invalid token
        return res.writeHead(302, { Location: '/signup?error=invalid_token' }).end();
      }

      // Valid: update users.is_verified = TRUE
      await db.markUserVerified(normalizedEmail);

      // Delete the pending record
      await db.deletePendingVerification(normalizedEmail);

      // Check role to route to designated portal
      const user = await db.getUserByEmail(normalizedEmail);
      const isRecruiter = user && user.role === 'recruiter';
      const redirectTarget = isRecruiter 
        ? `/recruiter?verified=true&email=${encodeURIComponent(normalizedEmail)}`
        : `/dashboard?verified=true&email=${encodeURIComponent(normalizedEmail)}`;

      return res.writeHead(302, { Location: redirectTarget }).end();
    } catch (err) {
      console.error('[Verify Email GET Error]', err);
      return res.writeHead(302, { Location: '/signup?error=invalid_token' }).end();
    }
  }

  // 2. POST Request: JSON verification (token or 6-digit PIN)
  if (req.method === 'POST') {
    try {
      const { email, token, pin } = req.body || {};
      const tokenOrPin = (token || pin || '').trim();
      const normalizedEmail = (email || '').trim().toLowerCase();

      if (!normalizedEmail || !tokenOrPin) {
        return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
      }

      const pending = await db.getPendingVerification(normalizedEmail, tokenOrPin);
      if (!pending) {
        return res.status(400).json({
          success: false,
          error: 'Verification code is invalid or has expired (15-minute validity window).'
        });
      }

      // Valid: update users.is_verified = TRUE & delete pending record
      await db.markUserVerified(normalizedEmail);
      await db.deletePendingVerification(normalizedEmail);

      const user = await db.getUserByEmail(normalizedEmail);
      const isRecruiter = user && user.role === 'recruiter';
      const redirect = isRecruiter ? '/recruiter' : '/dashboard';

      return res.status(200).json({
        success: true,
        message: 'Email successfully verified! Your account is activated.',
        user: {
          id: user ? user.id : 'user',
          name: user ? user.name : 'Student',
          email: normalizedEmail,
          role: user ? user.role : 'learner',
          is_verified: true
        },
        redirect
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
