// GET /api/auth/status?email=<encoded_email>
// Cross-Device Verification Auto-Polling & Session Status Check
const db = require('./db');
const { signUserToken, setUserCookie, verifyUser } = require('./authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:8000'}`);
    let email = url.searchParams.get('email');

    // If email not in query string, check if client sent it in request body
    if (!email && req.body && req.body.email) {
      email = req.body.email;
    }

    // If email is still not provided, check if user already has an active session cookie/token
    if (!email) {
      const auth = verifyUser(req);
      if (auth.valid && auth.user && auth.user.email) {
        email = auth.user.email;
      }
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        is_verified: false,
        error: 'Email parameter is required for status check.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        is_verified: false,
        error: 'User account not found.'
      });
    }

    const isVerified = Boolean(user.is_verified);

    if (isVerified) {
      // User verified: Issue JWT session token & set HTTP-only cookie for Device A
      const token = signUserToken(user);
      try {
        setUserCookie(res, token);
      } catch (cookieErr) {
        console.warn('[Auth Status] Could not set cookie header:', cookieErr.message);
      }

      return res.status(200).json({
        success: true,
        is_verified: true,
        verified: true,
        authenticated: true,
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
          is_verified: true,
          total_study_minutes: Number(user.total_study_minutes) || 0,
          total_lecture_minutes: Number(user.total_lecture_minutes) || 0,
          avg_exam_score: Number(user.avg_exam_score) || 0,
          dynamic_competence_percent: Number(user.dynamic_competence_percent) || 25.0
        },
        token
      });
    }

    // User exists but has not completed email verification yet
    return res.status(200).json({
      success: true,
      is_verified: false,
      verified: false,
      authenticated: false,
      email: normalizedEmail,
      message: 'Email verification pending. Click the link sent to your email to verify.'
    });
  } catch (err) {
    console.error('[Auth Status Error]', err);
    return res.status(500).json({
      success: false,
      is_verified: false,
      error: `Status check failed: ${err.message}`
    });
  }
};
