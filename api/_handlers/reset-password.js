// POST /api/auth/reset-password
// Verifies 6-digit OTP, enforces 5-min expiry, updates user password, and immediately deletes OTP from database
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
      // 1. Fetch matching record from public.password_resets
      const { data: record, error: fetchErr } = await supabase
        .from('password_resets')
        .select('*')
        .ilike('email', cleanEmail)
        .eq('token', cleanCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr || !record) {
        console.error(`[OTP CHECK FAILED] No matching row for ${cleanEmail} with code ${cleanCode}`, fetchErr ? fetchErr.message : '');
        return res.status(400).json({ success: false, error: 'Code not found. Please request a new code.' });
      }

      // 2. Enforce 5-Minute Expiry
      if (new Date(record.expires_at).getTime() < Date.now()) {
        // Delete expired code immediately
        await supabase.from('password_resets').delete().ilike('email', cleanEmail);
        return res.status(400).json({ success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' });
      }

      // 3. Update User Password in users table safely
      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      let updatedUser = null;
      let updateError = null;

      // Attempt 1: Try updating both password_hash and password columns if present
      const tryBoth = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          password: hashedPassword
        })
        .ilike('email', cleanEmail)
        .select('id, email, name');

      if (!tryBoth.error && tryBoth.data && tryBoth.data.length > 0) {
        updatedUser = tryBoth.data;
      } else {
        // Attempt 2: Fallback to password_hash (standard schema)
        const tryHash = await supabase
          .from('users')
          .update({ password_hash: hashedPassword })
          .ilike('email', cleanEmail)
          .select('id, email, name');

        if (!tryHash.error && tryHash.data && tryHash.data.length > 0) {
          updatedUser = tryHash.data;
        } else {
          // Attempt 3: Fallback if column is named password
          const tryPass = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .ilike('email', cleanEmail)
            .select('id, email, name');

          if (!tryPass.error && tryPass.data && tryPass.data.length > 0) {
            updatedUser = tryPass.data;
          } else {
            updateError = tryHash.error || tryBoth.error || tryPass.error;
          }
        }
      }

      // Fallback to direct Postgres pool if Supabase RLS / SDK update was blocked
      if (updateError || !updatedUser || updatedUser.length === 0) {
        const p = db.initPool ? db.initPool() : null;
        if (p) {
          try {
            const pgRes = await p.query(
              'UPDATE users SET password_hash = $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, name',
              [hashedPassword, cleanEmail]
            );
            if (pgRes.rows && pgRes.rows.length > 0) {
              updatedUser = pgRes.rows;
              updateError = null;
            }
          } catch (pgErr) {
            console.error('[Direct PG User Update Failed]:', pgErr.message);
          }
        }
      }

      if (updateError) {
        console.error('[PASSWORD UPDATE FAILED]:', updateError);
        return res.status(500).json({ success: false, error: 'Database update failed: ' + (updateError.message || JSON.stringify(updateError)) });
      }

      if (!updatedUser || updatedUser.length === 0) {
        console.error('[USER NOT FOUND FOR UPDATE]:', cleanEmail);
        return res.status(404).json({ success: false, error: 'User account not found to update password.' });
      }

      // 4. DELETE THE OTP FROM DATABASE IMMEDIATELY UPON SUCCESSFUL RESET
      await supabase
        .from('password_resets')
        .delete()
        .ilike('email', cleanEmail);

      return res.status(200).json({ success: true, message: 'Password updated successfully. You can now log in.' });
    }

    // Fallback path when Supabase client is not directly configured (PostgreSQL pool / local store)
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const result = await db.verifyAndUsePasswordReset(cleanEmail, cleanCode, hashedPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired verification code. Please request a new code.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now log in.'
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
