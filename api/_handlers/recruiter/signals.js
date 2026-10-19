// GET & POST /api/recruiter/signals
// Saves market signal and synthesizes headline into market_news
const db = require('../db');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retrieve all active market signals
  if (req.method === 'GET') {
    try {
      const signals = await db.getMarketSignals();
      return res.status(200).json({ success: true, signals });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST: Publish new recruiter hiring requirement
  if (req.method === 'POST') {
    try {
      const {
        recruiter_name,
        company,
        stream,
        domain,
        demand_surge,
        ctc_range,
        mandatory_skills,
        fresher_deficit,
        actionable_directive
      } = req.body || {};

      if (!company || !stream || !domain || !mandatory_skills) {
        return res.status(400).json({
          success: false,
          error: 'Company, stream, domain, and mandatory skills are required.'
        });
      }

      const skillsArray = Array.isArray(mandatory_skills)
        ? mandatory_skills
        : mandatory_skills.split(',').map(s => s.trim()).filter(Boolean);

      // 1. Save signal into market_signals
      const signal = await db.createMarketSignal({
        recruiter_name: recruiter_name || 'Hiring Lead',
        company: company.trim(),
        stream: stream.toUpperCase().trim(),
        domain: domain.trim(),
        demand_surge: demand_surge || '+75% Urgent Surge',
        ctc_range: ctc_range || '₹14 - ₹24 LPA',
        mandatory_skills: skillsArray,
        fresher_deficit: fresher_deficit || 'Candidates lack production depth and fail to diagnose latency or concurrency failures.',
        actionable_directive: actionable_directive || 'Build register-level or architectural capstones with verifiable benchmarks.'
      });

      // 2. Synthesize/insert headline into market_news for student feed
      const headlineTitle = `${company} Hiring Standard: ${domain} (${stream.toUpperCase()}) — Priority on ${skillsArray.slice(0, 3).join(', ')}`;
      const newsSummary = `Recruiter Alert from ${company}: "${fresher_deficit || 'Deficit observed in hands-on production depth'}". Directive for learners: ${actionable_directive || 'Focus on verifiable capstone proofs.'}`;

      const newsItem = await db.createMarketNews({
        title: headlineTitle,
        stream: stream.toUpperCase().trim(),
        summary: newsSummary,
        in_demand_skills: skillsArray,
        source_company: company.trim()
      });

      return res.status(200).json({
        success: true,
        message: `Hiring requirement for ${domain} published and broadcast to student feed!`,
        signal,
        newsItem
      });
    } catch (err) {
      console.error('[Market Signal Post Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
