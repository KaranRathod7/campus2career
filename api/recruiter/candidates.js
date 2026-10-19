// GET /api/recruiter/candidates
// Recruiter Verified Talent Directory & Dynamic Competence Index
const db = require('../db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use GET.' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost:8000'}`);
    const stream = url.searchParams.get('stream') || 'all';
    const domain = url.searchParams.get('domain') || 'all';
    const experience = url.searchParams.get('experience') || 'all';

    // Retrieve candidates enriched with dynamic competence levels, percentages, and verified talent badges
    const candidates = await db.getCandidates({ stream, domain, experience });

    return res.status(200).json({
      success: true,
      count: candidates.length,
      filter: { stream, domain, experience },
      candidates
    });
  } catch (err) {
    console.error('[Recruiter Candidates API Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
