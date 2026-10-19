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
    const { candidateId, recruiterCompany, recruiterName, domain, customMessage } = req.body || {};

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required.' });
    }

    const company = recruiterCompany || 'Enterprise Partner';

    // 1. Look up candidate in database
    const candidate = await db.getCandidateById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, error: `Candidate not found with ID: ${candidateId}` });
    }

    // 2. Dispatch automated interview invitation email via Brevo
    const emailResult = await sendInterviewInviteEmail({
      to: candidate.email,
      candidateName: candidate.name,
      recruiterCompany: company,
      recruiterName: recruiterName || 'Engineering Talent Acquisition',
      domain: domain || candidate.domain || 'Engineering Track',
      customMessage: customMessage || `We reviewed your verified skill score (${candidate.skill_score}%) and capstone on Campus2Career. We would like to schedule a technical round.`
    });

    console.log(`[Recruiter Invite] Dispatched invite to ${candidate.email} for ${company}`);

    return res.status(200).json({
      success: true,
      message: 'Interview invitation sent to candidate!',
      candidate: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        score: candidate.skill_score,
        company
      },
      delivered: emailResult.success,
      emailStatus: emailResult.error || 'Delivered via Brevo'
    });
  } catch (err) {
    console.error('[Recruiter Invite Error]', err);
    return res.status(500).json({ success: false, error: `Invite dispatch failed: ${err.message}` });
  }
};
