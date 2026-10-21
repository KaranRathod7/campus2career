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
        console.error(`[OTP CHECK FAILED] No matching row for ${cleanEmail} with code ${cleanCode}`);
        return res.status(400).json({ success: false, error: 'Code not found. Please request a new code.' });
      }

      // 2. Enforce 5-Minute Expiry
      if (new Date(record.expires_at).getTime() < Date.now()) {
        // Delete expired code immediately
        await supabase.from('password_resets').delete().eq('id', record.id);
        return res.status(400).json({ success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' });
      }

      // 3. Update User Password in users table
      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
        .ilike('email', cleanEmail)
        .select('id, email, name')
        .maybeSingle();

      if (userError) {
        console.error('[RESET FAILED] User update error in Supabase:', userError);
        return res.status(500).json({ success: false, error: 'Failed to update user password.' });
      }

      // 4. DELETE THE OTP FROM DATABASE IMMEDIATELY UPON SUCCESSFUL RESET
      await supabase.from('password_resets').delete().eq('id', record.id);

      return res.status(200).json({ success: true, message: 'Password reset successfully!' });
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
      message: result.message || 'Password reset successfully!'
    });
  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
