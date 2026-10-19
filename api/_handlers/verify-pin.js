// POST /api/verify-pin
// Manual 6-digit PIN verification against pending_verifications
const db = require('./db');
const { signUserToken, setUserCookie } = require('./authMiddleware');

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
    const { email, pin } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanPin = (pin || '').trim();

    if (!normalizedEmail || !cleanPin) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit PIN are required.' });
    }

    const pending = await db.getPendingVerification(normalizedEmail, cleanPin);
    if (!pending) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect or expired PIN. Please enter the valid 6-digit code received via email.'
      });
    }

    // Mark user verified
    await db.markUserVerified(normalizedEmail);
    // Delete pending record
    await db.deletePendingVerification(normalizedEmail);

    const user = await db.getUserByEmail(normalizedEmail) || {
      id: 'usr',
      name: 'User',
      email: normalizedEmail,
      role: 'learner',
      stream: 'IT'
    };
    const role = user.role || 'learner';
    const redirect = role === 'recruiter' ? '/recruiter' : '/dashboard';

    const token = signUserToken(user);
    setUserCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Account verified successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: normalizedEmail,
        role,
        stream: user.stream || 'IT',
        is_verified: true
      },
      token,
      redirect
    });
  } catch (err) {
    console.error('[Verify PIN Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
