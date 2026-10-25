// POST /api/auth/reset-password
// Verifies 6-digit OTP with brute-force rate-limiting (max 5 attempts), 5-min expiry,
// updates user password_hash, increments token_version to invalidate active sessions, and deletes OTP.
const bcrypt = require('bcryptjs');
const db = require('./db');

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
    const { email, code, otp, newPassword, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawCode = (code !== undefined && code !== null) ? code : otp;
    const cleanCode = String(rawCode || '').trim();
    const cleanPassword = String(newPassword || password || '').trim();

    if (!cleanEmail || !cleanCode) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }

    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'New password must be at least 4 characters long.' });
    }

    const supabase = db.getSupabaseClient();
    if (supabase) {
      // 1. Fetch latest reset record for cleanEmail (DO NOT filter by token so failed attempts can be tracked)
      const { data: record, error: fetchErr } = await supabase
        .from('password_resets')
        .select('*')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr || !record) {
        console.error(`[OTP CHECK FAILED] No matching reset row for ${cleanEmail}`, fetchErr ? fetchErr.message : '');
        return res.status(400).json({ success: false, error: 'Reset code not found or already used. Please request a new code.' });
      }

      // 2. Enforce 5-Minute Expiry
      if (new Date(record.expires_at).getTime() < Date.now()) {
        await supabase.from('password_resets').delete().ilike('email', cleanEmail);
        return res.status(400).json({ success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' });
      }

      // 3. Enforce Max 5 Failed OTP Attempts (Brute-Force Guard)
      const currentAttempts = Number(record.attempts) || 0;
      if (currentAttempts >= 5) {
        await supabase.from('password_resets').delete().ilike('email', cleanEmail);
        return res.status(403).json({
          success: false,
          error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
          attemptsRemaining: 0
        });
      }

      // 4. Verify OTP Code
      if (String(record.token).trim() !== cleanCode) {
        const newAttempts = currentAttempts + 1;
        if (newAttempts >= 5) {
          await supabase.from('password_resets').delete().ilike('email', cleanEmail);
          return res.status(403).json({
            success: false,
            error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
            attemptsRemaining: 0
          });
        }

        await supabase
          .from('password_resets')
          .update({ attempts: newAttempts })
          .eq('id', record.id);

        const remaining = 5 - newAttempts;
        return res.status(400).json({
          success: false,
          error: `Invalid verification code. ${remaining} attempt(s) remaining before security lockout.`,
          attemptsRemaining: remaining
        });
      }

      // 5. Code is valid! Fetch user to get current token_version
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, token_version')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const nextTokenVersion = ((existingUser && existingUser.token_version !== undefined && existingUser.token_version !== null)
        ? Number(existingUser.token_version)
        : 1) + 1;

      // 6. Update user password safely in users table (Strictly password_hash, NO plaintext password or updated_at)
      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      let updatedUser = null;
      let updateError = null;

      // Attempt 1: Update password_hash and token_version
      let tryHash = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          token_version: nextTokenVersion
        })
        .ilike('email', cleanEmail)
        .select('id, email, name, role, stream, branch, skills, college, year, token_version, total_study_minutes, total_lecture_minutes, avg_exam_score, dynamic_competence_percent');

      // Attempt 2: If token_version is missing in PostgREST schema cache, update only password_hash
      if (tryHash.error && tryHash.error.message && tryHash.error.message.includes('token_version')) {
        console.warn('[RESET] Retrying update without token_version column:', tryHash.error.message);
        tryHash = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword
          })
          .ilike('email', cleanEmail)
          .select('id, email, name, role, stream, branch, skills, college, year');
      }

      if (!tryHash.error && tryHash.data && tryHash.data.length > 0) {
        updatedUser = tryHash.data[0];
      } else {
        updateError = tryHash.error;
      }

      // Fallback to direct Postgres pool if Supabase SDK update was blocked or failed
      if (updateError || !updatedUser) {
        const p = db.initPool ? db.initPool() : null;
        if (p) {
          try {
            const pgRes = await p.query(
              'UPDATE users SET password_hash = $1, token_version = COALESCE(token_version, 1) + 1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, name, role, stream, branch, skills, college, year, token_version, total_study_minutes, total_lecture_minutes, avg_exam_score, dynamic_competence_percent',
              [hashedPassword, cleanEmail]
            );
            if (pgRes.rows && pgRes.rows.length > 0) {
              updatedUser = pgRes.rows[0];
              updateError = null;
            }
          } catch (pgErr) {
            console.warn('[Direct PG User Update with token_version failed, retrying without]:', pgErr.message);
            try {
              const pgRes2 = await p.query(
                'UPDATE users SET password_hash = $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, name, role, stream, branch, skills, college, year',
                [hashedPassword, cleanEmail]
              );
              if (pgRes2.rows && pgRes2.rows.length > 0) {
                updatedUser = pgRes2.rows[0];
                updateError = null;
              }
            } catch (pgErr2) {
              console.error('[Direct PG User Update Failed]:', pgErr2.message);
            }
          }
        }
      }

      if (updateError) {
        console.error('[PASSWORD UPDATE FAILED]:', updateError);
        return res.status(500).json({ success: false, error: 'Unable to update password at this time. Please try again or request a new code.' });
      }

      if (!updatedUser) {
        console.error('[USER NOT FOUND FOR UPDATE]:', cleanEmail);
        return res.status(404).json({ success: false, error: 'No account found matching this email address.' });
      }

      // 7. Invalidate & Delete the OTP from password_resets immediately
      try {
        await supabase
          .from('password_resets')
          .delete()
          .ilike('email', cleanEmail);
      } catch (delErr) {
        console.warn('[RESET OTP DELETE WARNING]:', delErr.message);
      }

      // 8. Sign JWT session token and set auth cookie so user is auto-authenticated
      let token = null;
      try {
        const { signUserToken, setUserCookie } = require('./authMiddleware');
        token = signUserToken(updatedUser);
        setUserCookie(res, token);
      } catch (authErr) {
        console.warn('[Reset Password Session Warning]:', authErr.message);
      }

      const role = updatedUser.role || 'learner';
      const redirect = role === 'recruiter' ? '/recruiter' : '/dashboard';

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully! You are now logged in.',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username || null,
          email: updatedUser.email,
          role: updatedUser.role || 'learner',
          stream: updatedUser.stream || null,
          branch: updatedUser.branch || updatedUser.stream || null,
          skills: updatedUser.skills || null,
          college: updatedUser.college || null,
          year: updatedUser.year || null,
          token_version: updatedUser.token_version || 1,
          is_verified: true,
          total_study_minutes: Number(updatedUser.total_study_minutes) || 0,
          total_lecture_minutes: Number(updatedUser.total_lecture_minutes) || 0,
          avg_exam_score: Number(updatedUser.avg_exam_score) || 0,
          dynamic_competence_percent: Number(updatedUser.dynamic_competence_percent) || 25.0
        },
        token,
        redirect
      });
    }

    // Fallback path when Supabase client is not directly configured (PostgreSQL pool / local store)
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const result = await db.verifyAndUsePasswordReset(cleanEmail, cleanCode, hashedPassword);

    if (!result.success) {
      const statusCode = result.status || 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Invalid or expired verification code. Please request a new code.',
        attemptsRemaining: result.attemptsRemaining
      });
    }

    let token = null;
    if (result.user) {
      try {
        const { signUserToken, setUserCookie } = require('./authMiddleware');
        token = signUserToken(result.user);
        setUserCookie(res, token);
      } catch (authErr) {
        console.warn('[Reset Password Session Warning]:', authErr.message);
      }
    }

    const role = (result.user && result.user.role) || 'learner';
    const redirect = role === 'recruiter' ? '/recruiter' : '/dashboard';

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully! You are now logged in.',
      user: result.user,
      token,
      redirect
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred while resetting your password. Please try again.' });
  }
};
