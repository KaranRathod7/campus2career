// Campus2Career Enterprise Multi-Transport Transactional Email Engine
// Supports Brevo API, Resend API, Nodemailer Direct SMTP (Gmail, Brevo, custom), SendGrid, and Sovereign Local Fallback
const fs = require('fs');
const path = require('path');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {}

const ROOT_DIR = fs.existsSync(path.join(__dirname, '..', '..', 'emails_outbox.json'))
  ? path.join(__dirname, '..', '..')
  : (fs.existsSync(path.join(__dirname, '..', 'emails_outbox.json'))
      ? path.join(__dirname, '..')
      : process.cwd());

const OUTBOX_FILE = path.join(ROOT_DIR, 'emails_outbox.json');
const CONFIG_FILE = path.join(ROOT_DIR, 'email_config.json');

// Read dynamic configuration from .env and email_config.json on every call
function getActiveEmailConfig() {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {}
  }

  const brevoKey = (process.env.BREVO_API_KEY || fileConfig.brevo_api_key || '').trim();
  const brevoFrom = (process.env.BREVO_FROM_EMAIL || fileConfig.brevo_from_email || fileConfig.sender_email || 'campus2career7@gmail.com').trim();

  const resendKey = (process.env.RESEND_API_KEY || fileConfig.resend_api_key || '').trim();
  const resendFrom = (process.env.RESEND_FROM_EMAIL || fileConfig.resend_from_email || 'onboarding@resend.dev').trim();

  const sendgridKey = (process.env.SENDGRID_API_KEY || fileConfig.sendgrid_api_key || '').trim();
  const sendgridFrom = (process.env.SENDGRID_FROM_EMAIL || fileConfig.sendgrid_from_email || brevoFrom).trim();

  const smtpHost = (process.env.SMTP_SERVER || process.env.SMTP_HOST || fileConfig.smtp_server || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || fileConfig.smtp_port || 587);
  const smtpUser = (process.env.SMTP_USER || fileConfig.smtp_user || '').trim();
  const smtpPass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || fileConfig.smtp_password || '').trim();

  const senderName = (fileConfig.sender_name || 'Campus2Career Verification').trim();

  return {
    brevoKey,
    brevoFrom,
    resendKey,
    resendFrom,
    sendgridKey,
    sendgridFrom,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    senderName
  };
}

// Append sent/generated email to local outbox file for admin visibility and auditing
function recordOutboxEmail(entry) {
  try {
    let outbox = [];
    if (fs.existsSync(OUTBOX_FILE)) {
      try {
        outbox = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf-8'));
      } catch (e) {
        outbox = [];
      }
    }
    const record = Object.assign({
      id: `email_${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }, entry);

    outbox.unshift(record);
    if (outbox.length > 100) outbox = outbox.slice(0, 100);
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(outbox, null, 2), 'utf-8');
    return record;
  } catch (err) {
    console.warn('[Outbox Warning]: Failed to record email in outbox:', err.message);
    return null;
  }
}

// 1. Resend REST API Transport
async function sendResendRaw({ to, subject, htmlContent, textContent, config }) {
  const cfg = config || getActiveEmailConfig();
  if (!cfg.resendKey) return { success: false, error: 'RESEND_API_KEY not configured' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${cfg.senderName} <${cfg.resendFrom}>`,
        to: [to],
        subject,
        text: textContent,
        html: htmlContent
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[Resend Success]: Dispatched message to ${to} (id: ${data.id})`);
      return { success: true, messageId: data.id || 'ok', provider: 'resend' };
    } else {
      console.warn('[Resend Error Response]:', data);
      return { success: false, error: (data && data.message) || JSON.stringify(data), provider: 'resend' };
    }
  } catch (err) {
    console.warn('[Resend Request Failed]:', err.message);
    return { success: false, error: err.message, provider: 'resend' };
  }
}

// 2. Brevo (Sendinblue) REST API Transport
async function sendBrevoRaw({ to, subject, htmlContent, textContent, config }) {
  const cfg = config || getActiveEmailConfig();
  if (!cfg.brevoKey) return { success: false, error: 'BREVO_API_KEY not configured' };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': cfg.brevoKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: cfg.senderName, email: cfg.brevoFrom },
        to: [{ email: to }],
        subject,
        textContent,
        htmlContent
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`[Brevo Success]: Dispatched message to ${to} (id: ${data.messageId || 'ok'})`);
      return { success: true, messageId: data.messageId || 'ok', provider: 'brevo' };
    } else {
      console.warn('[Brevo Error Response]:', data);
      return { success: false, error: data.message || JSON.stringify(data), provider: 'brevo' };
    }
  } catch (err) {
    console.warn('[Brevo Request Failed]:', err.message);
    return { success: false, error: err.message, provider: 'brevo' };
  }
}

// 3. Direct SMTP / Nodemailer Transport (e.g. Gmail App Password, Brevo SMTP, custom)
async function sendSmtpRaw({ to, subject, htmlContent, textContent, config }) {
  const cfg = config || getActiveEmailConfig();
  if (!nodemailer || !cfg.smtpUser || !cfg.smtpPass) {
    return { success: false, error: 'SMTP credentials or nodemailer not available' };
  }

  try {
    const isGmail = (cfg.smtpHost && cfg.smtpHost.includes('gmail')) || cfg.smtpUser.includes('gmail.com');
    const host = cfg.smtpHost || (isGmail ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const port = cfg.smtpPort || (host.includes('gmail') ? 465 : 587);
    const secure = (port === 465);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPass.replace(/\s+/g, '') // remove spaces from Gmail App Password if present
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    const info = await transporter.sendMail({
      from: `"${cfg.senderName}" <${cfg.smtpUser}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[SMTP Success]: Dispatched email to ${to} (id: ${info.messageId}) via ${host}`);
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  } catch (err) {
    console.warn('[SMTP Error]:', err.message);
    return { success: false, error: err.message, provider: 'smtp' };
  }
}

// 4. SendGrid REST API Transport
async function sendSendgridRaw({ to, subject, htmlContent, textContent, config }) {
  const cfg = config || getActiveEmailConfig();
  if (!cfg.sendgridKey) return { success: false, error: 'SENDGRID_API_KEY not configured' };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.sendgridKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: cfg.sendgridFrom, name: cfg.senderName },
        subject,
        content: [
          { type: 'text/plain', value: textContent || '' },
          { type: 'text/html', value: htmlContent || '' }
        ]
      })
    });

    if (res.status === 202 || res.ok) {
      console.log(`[SendGrid Success]: Dispatched message to ${to}`);
      return { success: true, messageId: 'sendgrid-' + Date.now(), provider: 'sendgrid' };
    } else {
      const errText = await res.text().catch(() => '');
      return { success: false, error: errText, provider: 'sendgrid' };
    }
  } catch (err) {
    return { success: false, error: err.message, provider: 'sendgrid' };
  }
}

// Dispatch email across all configured transports in order of speed and reliability
async function dispatchEmail({ to, subject, htmlContent, textContent }) {
  const cfg = getActiveEmailConfig();
  let lastError = null;

  // 1. Resend
  if (cfg.resendKey) {
    const res = await sendResendRaw({ to, subject, htmlContent, textContent, config: cfg });
    if (res.success) return { ...res, delivered: true };
    lastError = res.error;
  }

  // 2. Direct SMTP / Nodemailer (e.g. Gmail App Password or custom SMTP)
  if (cfg.smtpUser && cfg.smtpPass) {
    const res = await sendSmtpRaw({ to, subject, htmlContent, textContent, config: cfg });
    if (res.success) return { ...res, delivered: true };
    lastError = res.error;
  }

  // 3. Brevo REST API
  if (cfg.brevoKey) {
    const res = await sendBrevoRaw({ to, subject, htmlContent, textContent, config: cfg });
    if (res.success) return { ...res, delivered: true };
    lastError = res.error;
  }

  // 4. SendGrid
  if (cfg.sendgridKey) {
    const res = await sendSendgridRaw({ to, subject, htmlContent, textContent, config: cfg });
    if (res.success) return { ...res, delivered: true };
    lastError = res.error;
  }

  // If no transports are configured or all returned an error (e.g. Brevo key unauthorized)
  return {
    success: false,
    delivered: false,
    error: lastError || 'No active outbound email transport configured'
  };
}

// Account Registration & Verification Email Handler
async function sendVerificationEmail({ to, name = 'Student', pin, token, baseUrl = 'http://localhost:8000' }) {
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/api/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
  const subject = `Your Campus2Career Verification Code: ${pin}`;

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

  console.log(`[VERIFY DISPATCH] Initiating verification email dispatch to: ${to} (PIN: ${pin})`);

  const dispatchRes = await dispatchEmail({ to, subject, htmlContent, textContent });

  recordOutboxEmail({
    to,
    subject,
    code: pin,
    type: 'verification',
    link: verifyUrl,
    name,
    body: textContent,
    delivered: Boolean(dispatchRes.delivered),
    smtp_status: dispatchRes.delivered
      ? `Dispatched via ${dispatchRes.provider || 'email'} (ID: ${dispatchRes.messageId})`
      : `Delivery pending / fallback active (${dispatchRes.error})`,
    message_id: dispatchRes.messageId || null,
    provider: dispatchRes.provider || 'outbox-fallback',
    verified: false
  });

  if (dispatchRes.delivered) {
    return { success: true, delivered: true, pin, token, messageId: dispatchRes.messageId, provider: dispatchRes.provider };
  }

  console.log(`[SOVEREIGN FALLBACK] Verification code ${pin} generated and preserved for ${to}`);
  return {
    success: true,
    delivered: false,
    fallback: true,
    pin,
    token,
    error: dispatchRes.error,
    provider: 'local-sovereign'
  };
}

// Password Reset OTP Dispatch Handler
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

  console.log(`[RESET ATTEMPT] Initiating OTP dispatch for: ${to} (Code: ${code})`);

  const dispatchRes = await dispatchEmail({ to, subject, htmlContent, textContent });

  recordOutboxEmail({
    to,
    subject,
    code,
    type: 'password_reset',
    name,
    body: textContent,
    delivered: Boolean(dispatchRes.delivered),
    smtp_status: dispatchRes.delivered
      ? `Dispatched via ${dispatchRes.provider || 'email'} (ID: ${dispatchRes.messageId})`
      : `Delivery pending / fallback active (${dispatchRes.error})`,
    message_id: dispatchRes.messageId || null,
    provider: dispatchRes.provider || 'outbox-fallback',
    verified: false
  });

  if (dispatchRes.delivered) {
    return { success: true, delivered: true, code, messageId: dispatchRes.messageId, provider: dispatchRes.provider };
  }

  console.log(`[SOVEREIGN RESET FALLBACK] Password reset code ${code} active for ${to}`);
  return {
    success: true,
    delivered: false,
    fallback: true,
    code,
    error: dispatchRes.error,
    provider: 'local-sovereign'
  };
}

// Recruiter Interview Invitation Email Handler
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

  const dispatchRes = await dispatchEmail({ to, subject, htmlContent, textContent });

  recordOutboxEmail({
    to,
    subject,
    type: 'interview_invite',
    name: candidateName,
    body: textContent,
    delivered: Boolean(dispatchRes.delivered),
    smtp_status: dispatchRes.delivered ? `Dispatched via ${dispatchRes.provider}` : `Pending: ${dispatchRes.error}`,
    message_id: dispatchRes.messageId || null,
    provider: dispatchRes.provider || 'outbox-fallback',
    verified: false
  });

  return dispatchRes;
}

module.exports = {
  sendBrevoRaw,
  sendResendRaw,
  sendSmtpRaw,
  sendSendgridRaw,
  sendVerificationEmail,
  sendInterviewInviteEmail,
  sendPasswordResetOtpEmail,
  recordOutboxEmail,
  getActiveEmailConfig
};
