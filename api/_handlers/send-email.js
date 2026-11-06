// Vercel Serverless Function: POST /api/send-email
const emailService = require('./emailService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, code, type, link, name } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const emailSubject = subject || 'Campus2Career Verification Code';
    const recipientName = name || 'Student';
    const authCode = code || Math.floor(100000 + Math.random() * 900000).toString();
    const emailLink = link || `https://campus2career.vercel.app/?verified=true&email=${encodeURIComponent(to)}`;

    const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0B132B; color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #1E293B;">
      <div style="padding: 28px 32px; background: linear-gradient(135deg, #0B132B, #111C3A); border-bottom: 1px solid #1E293B;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Campus<span style="color: #008080;">2Career</span></h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">Personalized Core Skill Competence Engine</p>
      </div>
      <div style="padding: 32px; background: #0F172A;">
        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #F8FAFC;">Hello ${recipientName},</h2>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
          Thank you for using Campus2Career! To verify your email address and activate your account assessments, please use the 6-digit confirmation code below:
        </p>
        <div style="background: #1E293B; border: 2px dashed #008080; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #2DD4BF;">${authCode}</span>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">This code expires in 15 minutes. Do not share it with anyone.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${emailLink}" style="display: inline-block; background: #008080; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 13px;">
            &check; Click Here to Activate &amp; Verify Account
          </a>
        </div>
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px;">
          If you did not request this email, please ignore it. Your account security remains intact.
        </p>
      </div>
    </div>
    `;

    const plainText = `Hello ${recipientName},\n\nYour Campus2Career verification code is: ${authCode}\n\nOr click here to activate: ${emailLink}\n\nExpires in 15 minutes.`;

    const dispatchRes = await emailService.sendVerificationEmail({
      to,
      name: recipientName,
      pin: authCode,
      token: Buffer.from(authCode).toString('hex'),
      baseUrl: 'https://campus2career-pi.vercel.app'
    });

    return res.status(200).json({
      success: true,
      delivered: Boolean(dispatchRes.delivered),
      code: authCode,
      message: dispatchRes.delivered
        ? `Verification email dispatched to ${to}`
        : `Verification code generated: ${authCode}`,
      provider: dispatchRes.provider || 'local-fallback'
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
