// GET /api/admin/session
// Validates admin_session JWT cookie via verifyAdmin guard
const { verifyAdmin } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const guard = verifyAdmin(req);
  if (!guard.valid) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: guard.error
    });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    admin: guard.admin
  });
};
