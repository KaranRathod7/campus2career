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

    const ip = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');

    // 1. Rate Limiting Check
    const rateStatus = await db.checkRateLimit(ip, normalizedEmail);
    if (rateStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Security Alert: Too many failed verification attempts. Locked for ${rateStatus.remainingSecs}s.`,
        remainingSecs: rateStatus.remainingSecs,
        isLocked: true
      });
    }

    let pending;
    try {
      pending = await db.getPendingVerification(normalizedEmail, cleanPin);
    } catch (err) {
      console.error('[DB Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!pending) {
      const failed = await db.recordFailedAttempt(ip, normalizedEmail);
      const remainingAttempts = Math.max(0, 5 - failed.attempts);
      return res.status(400).json({
        success: false,
        error: failed.isLocked
          ? `Security Alert: Too many failed attempts. Verification locked for ${failed.remainingSecs}s.`
          : `Incorrect or expired PIN. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts,
        isLocked: failed.isLocked
      });
    }

    // Reset rate limit on success
    await db.clearRateLimit(ip, normalizedEmail);

    // Mark user verified in database
    try {
      await db.markUserVerified(normalizedEmail);
      await db.deletePendingVerification(normalizedEmail);
    } catch (err) {
      console.error('[DB Update Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Fetch verified user from database
    let user;
    try {
      user = await db.getUserByEmail(normalizedEmail);
    } catch (err) {
      console.error('[DB Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User record not found in database after verification.'
      });
    }

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
        stream: user.stream || null,
        branch: user.branch || user.stream || null,
        skills: user.skills || null,
        college: user.college || null,
        year: user.year || null,
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
