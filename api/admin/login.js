// POST /api/admin/login
// Backend Admin Authentication with Supabase, bcrypt, rate-limiting & JWT httpOnly cookie
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signAdminToken, setAdminCookie, getClientIp } = require('../authMiddleware');

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
    const ip = getClientIp(req);
    const body = req.body || {};
    const email = (body.email || 'admin@campus2career.org').trim().toLowerCase();
    const password = (body.password || body.passcode || body.secretKey || '').trim();

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password or passcode is required.' });
    }

    // 1. Rate Limiting Protection (database-persisted via login_attempts)
    const rateStatus = await db.checkRateLimit(ip, email);
    if (rateStatus.isLocked) {
      return res.status(429).json({
        success: false,
        error: `Security Alert: Too many failed attempts. Admin portal is locked for ${rateStatus.remainingSecs}s.`,
        remainingSecs: rateStatus.remainingSecs,
        isLocked: true
      });
    }

    // 2. Query users in Supabase / PostgreSQL
    const user = await db.getUserByEmail(email);

    if (!user || user.role !== 'admin') {
      const failed = await db.recordFailedAttempt(ip, email);
      const remainingAttempts = Math.max(0, 5 - failed.attempts);
      return res.status(401).json({
        success: false,
        error: failed.isLocked
          ? `Maximum attempts exceeded. Admin portal locked for ${failed.remainingSecs}s.`
          : `Invalid admin credentials. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts,
        isLocked: failed.isLocked,
        remainingSecs: failed.remainingSecs
      });
    }

    // 3. Compare password with bcrypt.compare
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Record failed attempt with exponential backoff in login_attempts
      const failed = await db.recordFailedAttempt(ip, email);
      const remainingAttempts = Math.max(0, 5 - failed.attempts);
      return res.status(401).json({
        success: false,
        error: failed.isLocked
          ? `Maximum attempts exceeded. Admin portal locked for ${failed.remainingSecs}s.`
          : `Incorrect master passcode. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts,
        isLocked: failed.isLocked,
        remainingSecs: failed.remainingSecs
      });
    }

    // 4. On Valid Login: Delete record from login_attempts
    await db.clearRateLimit(ip, email);

    // 5. Issue signed JWT via httpOnly, secure, SameSite=Strict cookie (admin_session) valid for 8 hours
    const token = signAdminToken(user);
    setAdminCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Sovereign Admin Authentication Granted. Welcome, Platform Owner!',
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token // Also returned for client headers if cross-domain
    });
  } catch (error) {
    console.error('[Admin Login Error]', error);
    return res.status(500).json({ success: false, error: `Internal Server Error: ${error.message}` });
  }
};
