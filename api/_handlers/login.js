// POST /api/login
// User login with rate limiting & role-based routing (/dashboard vs /recruiter)
const bcrypt = require('bcryptjs');
const db = require('./db');
const { getClientIp, signUserToken, setUserCookie } = require('./authMiddleware');

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
    const ip = getClientIp(req);
    const { email, password, clientTime, clientTimezone } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!normalizedEmail || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // 1. Rate limiting check (fast)
    const rateStatus = await db.checkRateLimit(ip, normalizedEmail);
    if (rateStatus.isLocked) {
      db.recordLoginAttempt({
        user_id: null,
        email: normalizedEmail,
        status: 'FAILED',
        ip_address: ip,
        user_agent: req.headers['user-agent'] || 'Unknown',
        clientTime,
        clientTimezone
      }).catch(() => {});

      return res.status(429).json({
        success: false,
        error: `Security Alert: Too many failed login attempts. Locked for ${rateStatus.remainingSecs}s.`,
        remainingSecs: rateStatus.remainingSecs,
        isLocked: true
      });
    }

    // 2. Fetch user
    let user;
    try {
      user = await db.getUserByEmail(normalizedEmail);
    } catch (err) {
      console.error('[DB Login Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: 'Unable to process login at this time. Please try again later.' });
    }

    if (!user) {
      const failed = await db.recordFailedAttempt(ip, normalizedEmail);
      db.recordLoginAttempt({
        user_id: null,
        email: normalizedEmail,
        status: 'FAILED',
        ip_address: ip,
        user_agent: req.headers['user-agent'] || 'Unknown',
        clientTime,
        clientTimezone
      }).catch(() => {});

      const remainingAttempts = Math.max(0, 5 - failed.attempts);
      return res.status(401).json({
        success: false,
        error: failed.isLocked
          ? `Security Alert: Too many failed attempts. Locked for ${failed.remainingSecs}s.`
          : `Invalid email or password. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts,
        isLocked: failed.isLocked
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isMatch) {
      const failed = await db.recordFailedAttempt(ip, normalizedEmail);
      db.recordLoginAttempt({
        user_id: user.id || null,
        email: normalizedEmail,
        status: 'FAILED',
        ip_address: ip,
        user_agent: req.headers['user-agent'] || 'Unknown',
        clientTime,
        clientTimezone
      }).catch(() => {});

      const remainingAttempts = Math.max(0, 5 - failed.attempts);
      return res.status(401).json({
        success: false,
        error: failed.isLocked
          ? `Security Alert: Too many failed attempts. Locked for ${failed.remainingSecs}s.`
          : `Invalid email or password. ${remainingAttempts} attempt(s) remaining before security lockout.`,
        remainingAttempts,
        isLocked: failed.isLocked
      });
    }

    // 4. Asynchronous fast background cleanup & proper local hour login tracking
    db.clearRateLimit(ip, normalizedEmail).catch(() => {});
    db.recordLoginAttempt({
      user_id: user.id,
      email: user.email,
      status: 'SUCCESS',
      ip_address: ip,
      user_agent: req.headers['user-agent'] || 'Unknown',
      clientTime,
      clientTimezone
    }).catch(e => console.warn('[Login Attempt Log Notice]:', e.message));

    // 5. Verification check
    if (!user.is_verified) {
      let pendingPin = null;
      try {
        const crypto = require('crypto');
        pendingPin = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingToken = crypto.randomBytes(32).toString('hex');
        await db.createPendingVerification(normalizedEmail, pendingPin, pendingToken);
        const { sendVerificationEmail } = require('./emailService');
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || 'localhost:8000';
        sendVerificationEmail({
          to: normalizedEmail,
          name: user.name || 'Student',
          pin: pendingPin,
          token: pendingToken,
          baseUrl: `${proto}://${host}`
        }).catch(err => console.warn('[Login Unverified Dispatch Warning]:', err.message));
      } catch (e) {
        console.warn('[Pending Verification Issue]:', e.message);
      }

      return res.status(403).json({
        success: false,
        needs_verification: true,
        needsVerification: true,
        pin: pendingPin,
        devPin: pendingPin,
        error: 'Your email address has not been verified yet. Please enter your 6-digit confirmation code below.',
        email: normalizedEmail
      });
    }

    // 6. Role-based routing target & JWT session issuance
    const role = user.role || 'learner';
    const redirectTarget = role === 'recruiter' ? '/recruiter' : '/dashboard';
    const token = signUserToken(user);
    setUserCookie(res, token);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || null,
        email: user.email,
        role: user.role,
        stream: user.stream || null,
        branch: user.branch || user.stream || null,
        skills: user.skills || null,
        active_domain: user.active_domain || null,
        activeTrackPreset: user.active_domain || null,
        college: user.college || null,
        year: user.year || null,
        token_version: user.token_version || 1,
        is_verified: true,
        onboarded: Boolean(user.onboarded),
        total_study_minutes: Number(user.total_study_minutes) || 0,
        total_lecture_minutes: Number(user.total_lecture_minutes) || 0,
        avg_exam_score: Number(user.avg_exam_score) || 0,
        dynamic_competence_percent: Number(user.dynamic_competence_percent) || 25.0
      },
      token,
      redirect: redirectTarget
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred during login. Please try again later.' });
  }
};
