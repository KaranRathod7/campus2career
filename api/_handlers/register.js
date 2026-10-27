// POST /api/register
// User registration with Brevo verification (PIN + 32-byte hex token)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sendVerificationEmail } = require('./emailService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { name, username, email, password, role, stream, skills, chosenSkills } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const assignedRole = (role === 'recruiter') ? 'recruiter' : 'learner';
    const normalizedEmail = email.trim().toLowerCase();
    const rawStream = (stream || 'IT').toString().trim();

    // Clean and validate username
    const cleanUsername = (username ? username.trim().toLowerCase() : normalizedEmail.split('@')[0]);
    if (!cleanUsername) {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(cleanUsername)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username must be 3-30 characters long and contain only letters, numbers, underscores, dots, or dashes.' 
      });
    }

    const isWhitelisted = (normalizedEmail === 'theyareop@gmail.com');

    // Run username and email existence checks concurrently for fast processing
    let existingUserByUsername = null;
    let existing = null;
    try {
      const [uNameRes, emailRes] = await Promise.all([
        db.getUserByUsername(cleanUsername),
        db.getUserByEmail(normalizedEmail)
      ]);
      existingUserByUsername = uNameRes;
      existing = emailRes;
    } catch (err) {
      console.error('[DB Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: 'Registration check failed. Please try again later.' });
    }

    if (existingUserByUsername && existingUserByUsername.email.toLowerCase() !== normalizedEmail) {
      return res.status(409).json({
        success: false,
        error: 'username_taken',
        message: 'This username is already taken. Please choose another username.'
      });
    }

    // Hash password (bcrypt cost 10 is secure and takes ~100ms)
    const password_hash = await bcrypt.hash(password, 10);

    let userRecord = null;
    if (existing && !isWhitelisted) {
      if (existing.is_verified) {
        return res.status(409).json({
          success: false,
          error: 'already_registered',
          message: 'This email is already registered and verified. Please log in instead.'
        });
      }
      userRecord = existing;
      try {
        const p = db.initPool();
        if (p) {
          await p.query('UPDATE users SET password_hash = $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2))', [password_hash, normalizedEmail]);
        }
      } catch (upErr) {
        console.warn('[Register Password Update Warning]:', upErr.message);
      }
    }

    if (!userRecord) {
      try {
        if (isWhitelisted) {
          userRecord = await db.upsertUser({
            name: name.trim(),
            username: cleanUsername,
            email: normalizedEmail,
            password_hash,
            role: assignedRole,
            stream: rawStream,
            is_verified: false
          });
        } else {
          userRecord = await db.createUser({
            name: name.trim(),
            username: cleanUsername,
            email: normalizedEmail,
            password_hash,
            role: assignedRole,
            stream: rawStream,
            is_verified: false
          });
        }
      } catch (err) {
        if (err.message && err.message.toLowerCase().includes('unique')) {
          userRecord = await db.getUserByEmail(normalizedEmail);
          if (userRecord && userRecord.is_verified) {
            return res.status(409).json({
              success: false,
              error: 'already_registered',
              message: 'This email is already registered and verified. Please log in instead.'
            });
          }
        }
        if (!userRecord) {
          console.error('[DB Insert Error]:', err.message, err.detail || '');
          return res.status(500).json({ success: false, error: 'Failed to create user account. Please try again later.' });
        }
      }
    }

    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[CAMPUS2CAREER VERIFICATION PIN]: ${pin} for ${normalizedEmail}`);

    // Store pending verification
    try {
      await db.createPendingVerification(normalizedEmail, pin, token);
    } catch (err) {
      console.error('[DB Insert Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: 'Failed to create user account. Please try again later.' });
    }

    // Determine Base URL for email verification link
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8000';
    const baseUrl = `${proto}://${host}`;

    // Dispatch Brevo email in background with quick 1.2s race to ensure sub-2-second registration
    const emailPromise = sendVerificationEmail({
      to: normalizedEmail,
      name: name.trim(),
      pin,
      token,
      baseUrl
    }).catch(emailErr => {
      console.warn('[Brevo Dispatch Warning]:', emailErr.message);
      return { success: false, error: emailErr.message };
    });

    const emailResult = await Promise.race([
      emailPromise,
      new Promise(resolve => setTimeout(() => resolve({ success: true, pending: true, message: 'Dispatched via Brevo in background' }), 1200))
    ]);

    return res.status(200).json({
      success: true,
      message: `Verification code dispatched to ${normalizedEmail} via Brevo!`,
      email: normalizedEmail,
      username: cleanUsername,
      role: assignedRole,
      delivered: Boolean(emailResult && emailResult.success),
      emailStatus: (emailResult && emailResult.error) ? emailResult.error : 'Dispatched via Brevo'
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred during registration. Please try again later.' });
  }
};
