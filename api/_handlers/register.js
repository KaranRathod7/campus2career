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
    const { name, email, password, role, stream } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const assignedRole = (role === 'recruiter') ? 'recruiter' : 'learner';
    const normalizedEmail = email.trim().toLowerCase();

    const isWhitelisted = (normalizedEmail === 'theyareop@gmail.com');

    // Check if user already exists
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing && !isWhitelisted) {
      return res.status(409).json({
        success: false,
        error: 'already_registered',
        message: 'This email is already registered. Please log in instead.'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create or update unverified user (whitelisted accounts bypass duplicate constraints via upsert)
    let userRecord;
    if (isWhitelisted) {
      userRecord = await db.upsertUser({
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role: assignedRole,
        stream: stream || 'IT',
        is_verified: false
      });
    } else {
      userRecord = await db.createUser({
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        role: assignedRole,
        stream: stream || 'IT',
        is_verified: false
      });
    }

    // Generate 6-digit random PIN & 32-byte secure random hex token
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');

    // Store into pending_verifications with 15-minute expiration
    await db.createPendingVerification(normalizedEmail, pin, token);

    // Determine Base URL for email verification link
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost:8000';
    const baseUrl = `${proto}://${host}`;

    // Send Brevo transactional email
    const emailResult = await sendVerificationEmail({
      to: normalizedEmail,
      name: name.trim(),
      pin,
      token,
      baseUrl
    });

    return res.status(200).json({
      success: true,
      message: `Verification code and 1-click link dispatched to ${normalizedEmail} via Brevo!`,
      email: normalizedEmail,
      role: assignedRole,
      delivered: emailResult.success,
      emailStatus: emailResult.error || 'Dispatched via Brevo'
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    return res.status(500).json({ success: false, error: `Registration error: ${error.message}` });
  }
};
