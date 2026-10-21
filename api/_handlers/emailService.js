// Brevo & Resend Transactional Email Service for Campus2Career
const BREVO_API_KEY = process.env.BREVO_API_KEY || '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';
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'campus2career7@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const SENDER_NAME = 'Campus2Career Verification';

async function sendResendRaw({ to, subject, htmlContent, textContent }) {
  if (!RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${RESEND_FROM_EMAIL}>`,
        to: [to],
        subject,
        text: textContent,
        html: htmlContent
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[Resend Success]: Dispatched message to ${to} (id: ${data.id})`);
      return { success: true, messageId: data.id || 'ok' };
    } else {
      console.error('[Resend Error Response]:', data);
      return { success: false, error: (data && data.message) || JSON.stringify(data) };
    }
  } catch (err) {
    console.error('[Resend Request Failed]:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendBrevoRaw({ to, subject, htmlContent, textContent }) {
  if (!BREVO_API_KEY) {
    console.warn('[Brevo] BREVO_API_KEY not configured.');
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: BREVO_FROM_EMAIL },
        to: [{ email: to }],
        subject,
        textContent,
        htmlContent
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[Brevo Success]: Dispatched message to ${to} (id: ${data.messageId || 'ok'})`);
      return { success: true, messageId: data.messageId || 'ok' };
    } else {
      console.error('[Brevo Error Response]:', data);
      return { success: false, error: data.message || JSON.stringify(data) };
    }
  } catch (err) {
    console.error('[Brevo Request Failed]:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendVerificationEmail({ to, name = 'Student', pin, token, baseUrl = 'http://localhost:8000' }) {
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/api/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
  const subject = 'Campus2Career — Account Verification & Activation';

  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
    <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Personalized Core Skill Competence Engine</p>
    </div>
    <div style="padding: 32px; background: #0F172A;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #F8FAFC;">Hello ${name},</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
        Welcome to Campus2Career! To verify your email address and activate your engineering assessments and talent profile, use your 6-digit PIN or click the direct one-click verification link below:
      </p>
      
      <div style="background: #1E293B; border: 2px dashed #008080; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #2DD4BF; white-space: nowrap !important; word-break: keep-all;">${pin}</span>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">This verification code expires in 15 minutes. Never share this code with anyone.</p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: #008080; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(0, 128, 128, 0.4);">
          &check; 1-Click Activate &amp; Verify Account
        </a>
      </div>

      <p style="margin: 16px 0 0 0; font-size: 11px; color: #64748B; word-break: break-all; text-align: center;">
        Direct link: <a href="${verifyUrl}" style="color: #2DD4BF;">${verifyUrl}</a>
      </p>

      <p style="margin: 28px 0 0 0; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px;">
        If you did not initiate this request, you can safely ignore this email.
      </p>
    </div>
  </div>
  `;

  const textContent = `Hello ${name},\n\nYour 6-digit Campus2Career verification PIN is: ${pin}\n\nOr click here to activate your account:\n${verifyUrl}\n\nExpires in 15 minutes.`;

  return await sendBrevoRaw({ to, subject, htmlContent, textContent });
}

async function sendInterviewInviteEmail({ to, candidateName, recruiterCompany, recruiterName, domain, customMessage }) {
  const subject = `Campus2Career Interview Invitation: ${recruiterCompany} Technical Assessment`;

  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
    <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Direct Recruiter Hiring Pipeline &amp; Talent Discovery</p>
    </div>
    <div style="padding: 32px; background: #0F172A;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(45, 212, 191, 0.15); color: #2DD4BF; border: 1px solid rgba(45, 212, 191, 0.3); margin-bottom: 16px;">
        OFFICIAL INTERVIEW INVITATION
      </div>
      <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #F8FAFC;">Dear ${candidateName},</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
        Congratulations! Your verified high-skill assessment score and capstone proof on Campus2Career caught the attention of the engineering talent team at <strong>${recruiterCompany}</strong>.
      </p>

      <div style="background: #1E293B; border-left: 4px solid #008080; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #2DD4BF;">Hiring Team Details:</p>
        <p style="margin: 0; font-size: 13px; color: #E2E8F0;"><strong>Company:</strong> ${recruiterCompany}</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2E8F0;"><strong>Invited By:</strong> ${recruiterName || 'Talent Acquisition'}</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #E2E8F0;"><strong>Engineering Track:</strong> ${domain || 'Core Engineering'}</p>
      </div>

      <div style="background: #111C3A; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Message from the Hiring Manager:</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #E2E8F0; font-style: italic;">
          "${customMessage || 'We were impressed by your benchmark scores and verified capstone architecture. We would like to invite you for a 45-minute technical discussion.'}"
        </p>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #94A3B8;">
        The recruitment team will reach out directly to your registered email address with calendar scheduling options. Please keep your capstone repository and architecture diagrams accessible.
      </p>
    </div>
  </div>
  `;

  const textContent = `Dear ${candidateName},\n\nYou have received an interview invitation from ${recruiterCompany} for the ${domain || 'Core Engineering'} track.\n\nInvited By: ${recruiterName || 'Recruiter'}\n\nCheck your Campus2Career portal for details.`;

  return await sendBrevoRaw({ to, subject, htmlContent, textContent });
}

async function sendPasswordResetOtpEmail({ to, name = 'Student', code }) {
  const subject = 'Campus2Career — Password Reset Verification Code';

  const htmlContent = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
    <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Security &amp; Account Recovery</p>
    </div>
    <div style="padding: 32px; background: #0F172A;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #F8FAFC;">Hello ${name},</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
        We received a request to reset your password for your Campus2Career account. Enter the 6-digit verification code below to set a new password:
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        <span style="
          display: inline-block;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
          padding: 12px 24px;
          border-radius: 8px;
          border: 1px solid rgba(34, 197, 94, 0.25);
          white-space: nowrap !important;
          word-break: keep-all;
          font-family: 'Courier New', Courier, monospace;
        ">
          ${code}
        </span>
        <p style="margin: 12px 0 0 0; font-size: 11px; color: #94A3B8;">This verification code expires in 5 minutes. Never share this code with anyone.</p>
      </div>

      <p style="margin: 28px 0 0 0; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px;">
        If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
      </p>
    </div>
  </div>
  `;

  const textContent = `Hello ${name},\n\nYour 6-digit Campus2Career password reset code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`;

  console.log(`[RESET ATTEMPT] Initiating OTP send for: ${to}`);
  console.log(`[PASSWORD RESET OTP]: ${code} for ${to}`);

  // 1. Try Resend if configured
  if (RESEND_API_KEY) {
    console.log(`[Transport] Attempting dispatch via Resend for ${to}...`);
    const resendRes = await sendResendRaw({ to, subject, htmlContent, textContent });
    if (resendRes.success) return resendRes;
    console.warn(`[Transport Notice] Resend dispatch failed (${resendRes.error}), falling back to Brevo...`);
  }

  // 2. Dispatch via Brevo
  return await sendBrevoRaw({ to, subject, htmlContent, textContent });
}

module.exports = {
  sendBrevoRaw,
  sendVerificationEmail,
  sendInterviewInviteEmail,
  sendPasswordResetOtpEmail
};
