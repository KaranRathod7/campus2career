// GET & DELETE /api/admin/users
// Sovereign Admin User Management Endpoint
const db = require('../db');
const { verifyAdmin, getClientIp } = require('../authMiddleware');

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Guard check: Sovereign Admin verification
  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      error: auth.error || 'Unauthorized: Admin privileges required.'
    });
  }

  const ip = getClientIp(req);

  // GET: Fetch all registered users
  if (req.method === 'GET') {
    try {
      const users = await db.getAllUsers();
      return res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      console.error('[Admin Users GET Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // DELETE: Delete a user by ID or email
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost:8000'}`);
      const idOrEmail = url.searchParams.get('id') || url.searchParams.get('email') || (req.body && (req.body.id || req.body.email));

      if (!idOrEmail) {
        return res.status(400).json({ success: false, error: 'User ID or email is required for deletion.' });
      }

      // Safeguard: Prevent deleting the primary admin account
      if (idOrEmail.toLowerCase() === 'admin@campus2career.org' || idOrEmail === 'admin-uuid-1') {
        return res.status(403).json({ success: false, error: 'Sovereign platform administrator account cannot be deleted.' });
      }

      const deleted = await db.deleteUser(idOrEmail);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'User not found or already removed.' });
      }

      // Log administrative audit action
      await db.recordAuditLog({
        actor_email: auth.admin.email,
        action: 'DELETE_USER',
        details: `Deleted user record: ${idOrEmail}`,
        ip_address: ip
      });

      return res.status(200).json({
        success: true,
        message: `User ${idOrEmail} deleted successfully.`
      });
    } catch (err) {
      console.error('[Admin Users DELETE Error]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
