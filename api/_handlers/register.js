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

    // Check if username already exists
    try {
      const existingUserByUsername = await db.getUserByUsername(cleanUsername);
      if (existingUserByUsername && existingUserByUsername.email.toLowerCase() !== normalizedEmail) {
        return res.status(409).json({
          success: false,
          error: 'username_taken',
          message: 'This username is already taken. Please choose another username.'
        });
      }
    } catch (err) {
      console.error('[DB Username Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: 'Registration check failed. Please try again later.' });
    }

    // Check if user already exists
    let existing;
    try {
      existing = await db.getUserByEmail(normalizedEmail);
    } catch (err) {
      console.error('[DB Lookup Error]:', err.message, err.detail);
      return res.status(500).json({ success: false, error: 'Registration check failed. Please try again later.' });
    }

    // Hash password
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
      // If user exists but is NOT verified yet, update their password hash and re-issue verification PIN!
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
      // Direct Database Insertion on Registration:
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
        // Handle race condition where user was inserted concurrently
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

    // Seed chosen skills or auto-seed stream skills
    try {
      const skillsToSeed = (Array.isArray(skills) && skills.length > 0) ? skills : ((Array.isArray(chosenSkills) && chosenSkills.length > 0) ? chosenSkills : null);
      if (skillsToSeed) {
        await db.syncStudentSkills({
          user_id: userRecord.id,
          user_email: userRecord.email,
          stream: rawStream,
          skills: skillsToSeed.map(s => {
            if (typeof s === 'string') {
              return { skill_name: s, base_percentage: 35, total_score: 35, category: 'Core Skill', status: 'UNVERIFIED BASELINE' };
            }
            return {
              skill_id: s.id || s.skill_id,
              skill_name: s.name || s.skill_name,
              category: s.category || 'Core Skill',
              base_percentage: s.base_percentage || s.baseScore || s.score || 35,
              total_score: s.total_score || s.score || 35,
              status: s.status || 'UNVERIFIED BASELINE'
            };
          })
        });
      } else {
        await db.autoSeedStudentSkills({
          user_id: userRecord.id,
          user_email: userRecord.email,
          user_name: userRecord.name,
          stream: rawStream,
          base_percentage: 35
        });
      }
    } catch (seedErr) {
      console.warn('[Registration Auto-Seed Notice]:', seedErr.message);
    }

    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[CAMPUS2CAREER VERIFICATION PIN]: ${pin} for ${normalizedEmail}`);

    // Store into pending_verifications in database with 15-minute expiration
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

    // Send Brevo transactional email
    let emailResult = { success: false, error: 'Brevo email not dispatched' };
    try {
      emailResult = await sendVerificationEmail({
        to: normalizedEmail,
        name: name.trim(),
        pin,
        token,
        baseUrl
      });
    } catch (emailErr) {
      console.warn('[Brevo Dispatch Warning]:', emailErr.message);
      emailResult = { success: false, error: emailErr.message };
    }

    return res.status(200).json({
      success: true,
      message: `Verification code and 1-click link dispatched to ${normalizedEmail} via Brevo!`,
      email: normalizedEmail,
      username: cleanUsername,
      role: assignedRole,
      delivered: emailResult.success,
      emailStatus: emailResult.error || 'Dispatched via Brevo'
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred during registration. Please try again later.' });
  }
};
