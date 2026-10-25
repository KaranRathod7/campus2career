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

  // 1. GET Request: 1-Click Link from Brevo email OR Status Polling Check
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost:8000'}`);
      const isCheck = url.searchParams.get('check') === 'true' || url.searchParams.get('status') === 'true';
      const email = url.searchParams.get('email');

      // Polling check for cross-device verification
      if (isCheck && email) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await db.getUserByEmail(normalizedEmail);
        if (user && user.is_verified) {
          const { signUserToken, setUserCookie } = require('./authMiddleware');
          const token = signUserToken(user);
          setUserCookie(res, token);
          return res.status(200).json({
            success: true,
            is_verified: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || 'learner',
              stream: user.stream || null,
              branch: user.branch || user.stream || null,
              skills: user.skills || null,
              college: user.college || null,
              year: user.year || null,
              is_verified: true
            },
            token
          });
        }
        return res.status(200).json({
          success: true,
          is_verified: false
        });
      }

      const token = url.searchParams.get('token');

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
      if (user) {
        try {
          const { signUserToken, setUserCookie } = require('./authMiddleware');
          const token = signUserToken(user);
          setUserCookie(res, token);
        } catch (e) {
          console.warn('[Verify Email] Failed to set cookie on redirect:', e);
        }
      }
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
      if (!user) {
        return res.status(404).json({ success: false, error: 'User record not found in database.' });
      }

      const isRecruiter = user.role === 'recruiter';
      const redirect = isRecruiter ? '/recruiter' : '/dashboard';

      return res.status(200).json({
        success: true,
        message: 'Email successfully verified! Your account is activated.',
        user: {
          id: user.id,
          name: user.name,
          email: normalizedEmail,
          role: user.role || 'learner',
          stream: user.stream || null,
          branch: user.branch || user.stream || null,
          skills: user.skills || null,
          college: user.college || null,
          year: user.year || null,
          is_verified: true
        },
        redirect
      });
    } catch (err) {
      console.error('[Verify Email Error]:', err);
      return res.status(500).json({ success: false, error: 'An unexpected error occurred during email verification. Please try again.' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
