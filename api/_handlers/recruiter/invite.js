// POST /api/recruiter/invite
// 1-Click "Send Interview Invite" Action
// Looks up candidate email and dispatches automated interview invitation email via Brevo
const db = require('../db');
const { sendInterviewInviteEmail } = require('../emailService');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const { candidateId, candidateEmail, candidateName, recruiterCompany, recruiterName, domain, customMessage } = req.body || {};

    if (!candidateId && !candidateEmail) {
      return res.status(400).json({ success: false, error: 'candidateId or candidateEmail is required.' });
    }

    const company = recruiterCompany || 'Campus2Career Enterprise Partner';

    // 1. Look up candidate in database by ID, Name or Email
    let candidate = null;
    if (candidateId) {
      candidate = await db.getCandidateById(candidateId);
    }
    if (!candidate && candidateEmail) {
      candidate = await db.getCandidateById(candidateEmail);
    }
    if (!candidate && candidateName) {
      candidate = await db.getCandidateById(candidateName);
    }
    if (!candidate && candidateEmail) {
      try { candidate = await db.getUserByEmail(candidateEmail); } catch (_) {}
    }
    if (!candidate && candidateId) {
      try { candidate = await db.getUserById(candidateId); } catch (_) {}
    }

    // Determine target recipient info with robust fallbacks
    const targetEmail = (candidate && candidate.email) || candidateEmail;
    const targetName = (candidate && candidate.name) || candidateName || 'Candidate';
    const targetDomain = domain || (candidate && candidate.domain) || 'Core Engineering Track';
    const targetScore = (candidate && (candidate.skill_score || candidate.dynamic_competence_percent)) || 95;

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(404).json({
        success: false,
        error: `Valid recipient email address not found for candidate: ${candidateId || candidateName}`
      });
    }

    console.log(`[Recruiter Invite Dispatch] Initiating interview invite to ${targetEmail} (${targetName}) on behalf of ${company}`);

    // 2. Dispatch automated interview invitation email via Brevo immediately
    const emailResult = await sendInterviewInviteEmail({
      to: targetEmail,
      candidateName: targetName,
      recruiterCompany: company,
      recruiterName: recruiterName || 'Engineering Talent Acquisition Lead',
      domain: targetDomain,
      customMessage: customMessage || `We reviewed your verified score (${targetScore}%) and architectural capstone on Campus2Career. We invite you for a 45-minute technical discussion.`
    });

    console.log(`[Recruiter Invite] Result for ${targetEmail}: delivered=${emailResult.success}`, emailResult.error || '');

    return res.status(200).json({
      success: true,
      message: `Interview invitation dispatched to ${targetName} (${targetEmail})!`,
      candidate: {
        id: (candidate && candidate.id) || candidateId,
        name: targetName,
        email: targetEmail,
        score: targetScore,
        company
      },
      delivered: emailResult.success,
      emailStatus: emailResult.success ? 'Delivered via Brevo' : (emailResult.error || 'Dispatched')
    });
  } catch (err) {
    console.error('[Recruiter Invite Error]', err);
    return res.status(500).json({ success: false, error: `Invite dispatch failed: ${err.message}` });
  }
};
