// GET /api/news
// Returns market_news and latest recruiter hiring signals for the student feed
const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [news, signals] = await Promise.all([
      db.getMarketNews(),
      db.getMarketSignals()
    ]);

    return res.status(200).json({
      success: true,
      news,
      signals
    });
  } catch (err) {
    console.error('[News API Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
