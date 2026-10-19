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
    const { email, password } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!normalizedEmail || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // 1. Rate limiting check
    const rateStatus = await db.checkRateLimit(ip, normalizedEmail);
    if (rateStatus.isLocked) {
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
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!user) {
      const failed = await db.recordFailedAttempt(ip, normalizedEmail);
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

    // 4. Clear rate limit on successful credentials
    await db.clearRateLimit(ip, normalizedEmail);

    // 5. Verification check
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        needs_verification: true,
        needsVerification: true,
        error: 'Your email address has not been verified yet. Please check your email for the 6-digit confirmation code.',
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
        email: user.email,
        role: user.role,
        stream: user.stream || null,
        branch: user.branch || user.stream || null,
        skills: user.skills || null,
        college: user.college || null,
        year: user.year || null,
        is_verified: true,
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
    return res.status(500).json({ success: false, error: `Login error: ${err.message}` });
  }
};
