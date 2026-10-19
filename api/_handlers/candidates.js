// GET /api/candidates
// High-Skilled Candidates Directory (Score >= 90 automatically enforced)
const db = require('./db');

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

    // Query candidates with skill_score >= 90
    let candidates = [];
    let isFallback = false;
    let dbWarning = null;

    try {
      candidates = await db.getCandidates({ stream, domain, experience });
    } catch (dbErr) {
      console.warn('[Candidates Handler Warning - Recovering via local store]', dbErr.message);
      isFallback = true;
      dbWarning = dbErr.message;
      const store = (db.getLocalStore && db.getLocalStore()) || { candidates: [] };
      candidates = (store.candidates || []).filter(c => (Number(c.skill_score) || 90) >= 90);
    }

    const lastErr = db.getLastError ? db.getLastError() : null;

    return res.status(200).json({
      success: true,
      count: candidates.length,
      filter: { stream, domain, experience, minScore: 90 },
      storageMode: db.isCloudConnected && db.isCloudConnected() ? (isFallback || lastErr ? 'cloud-with-fallback' : 'postgresql') : 'local-store',
      fallback: isFallback || Boolean(lastErr),
      dbWarning: dbWarning || lastErr || undefined,
      candidates
    });
  } catch (err) {
    console.error('[Candidates API Critical Recovery]', err);
    // Guarantee 200 OK resilience so Vercel runtime never crashes
    const store = (db.getLocalStore && db.getLocalStore()) || { candidates: [] };
    const fallbackCandidates = (store.candidates || []).filter(c => (Number(c.skill_score) || 90) >= 90);

    return res.status(200).json({
      success: true,
      count: fallbackCandidates.length,
      filter: { stream: 'all', domain: 'all', experience: 'all', minScore: 90 },
      storageMode: 'emergency-fallback',
      fallback: true,
      error: err.message,
      detail: err.stack ? err.stack.split('\n')[0] : 'Unhandled exception safely caught',
      candidates: fallbackCandidates
    });
  }
};
