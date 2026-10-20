// POST & GET /api/logout & /api/auth/logout
const { clearUserCookie, clearAdminCookie } = require('./authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    clearUserCookie(res);
    clearAdminCookie(res);
  } catch (e) {
    console.warn('[Logout Notice]', e.message);
  }

  return res.status(200).json({ success: true, message: 'Logged out successfully. All sessions ended.' });
};
