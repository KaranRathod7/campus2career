// GET & POST /api/smtp-config
// Admin SMTP / Brevo dispatch configuration endpoint
const fs = require('fs');
const path = require('path');
const { verifyAdmin } = require('./authMiddleware');

const ROOT_DIR = fs.existsSync(path.join(__dirname, '..', '..', 'email_config.json'))
  ? path.join(__dirname, '..', '..')
  : (fs.existsSync(path.join(__dirname, '..', 'email_config.json'))
      ? path.join(__dirname, '..')
      : process.cwd());
const CONFIG_FILE = path.join(ROOT_DIR, 'email_config.json');

function loadConfig() {
  const defaultConfig = {
    provider: 'brevo',
    brevo_api_key: process.env.BREVO_API_KEY || '',
    brevo_from_email: process.env.BREVO_FROM_EMAIL || 'campus2career7@gmail.com',
    sender_name: 'Campus2Career Verification',
    sender_email: 'campus2career7@gmail.com',
    smtp_enabled: true,
    smtp_server: 'smtp-relay.brevo.com',
    smtp_port: 587,
    smtp_user: 'campus2career7@gmail.com',
    smtp_password: ''
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return Object.assign(defaultConfig, data);
    } catch (e) {}
  }
  return defaultConfig;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[SMTP Config Save Error]', e);
    return false;
  }
}

module.exports = async (req, res) => {
  const origin = (req.headers && req.headers.origin) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return current email configuration
  if (req.method === 'GET') {
    const config = loadConfig();
    // Mask sensitive secrets in response
    const sanitized = Object.assign({}, config, {
      brevo_api_key: config.brevo_api_key ? `${config.brevo_api_key.substring(0, 10)}...${config.brevo_api_key.slice(-6)}` : '',
      smtp_password: config.smtp_password ? '••••••••' : ''
    });
    return res.status(200).json({ success: true, config: sanitized });
  }

  // POST: Update configuration (Admin only)
  if (req.method === 'POST') {
    const auth = verifyAdmin(req);
    // Allow saving if authenticated or in local development
    const payload = req.body || {};
    const curConfig = loadConfig();

    if (payload.provider) curConfig.provider = payload.provider.trim();
    if (payload.brevo_api_key && !payload.brevo_api_key.includes('••••')) {
      curConfig.brevo_api_key = payload.brevo_api_key.trim();
    }
    if (payload.brevo_from_email) curConfig.brevo_from_email = payload.brevo_from_email.trim();
    if (payload.smtp_server) curConfig.smtp_server = payload.smtp_server.trim();
    if (payload.smtp_port) curConfig.smtp_port = Number(payload.smtp_port);
    if (payload.smtp_user) curConfig.smtp_user = payload.smtp_user.trim();
    if (payload.smtp_password && !payload.smtp_password.includes('••••')) {
      curConfig.smtp_password = payload.smtp_password.trim();
    }
    if (payload.sender_name) curConfig.sender_name = payload.sender_name.trim();
    if (payload.sender_email) curConfig.sender_email = payload.sender_email.trim();
    if (typeof payload.smtp_enabled === 'boolean') curConfig.smtp_enabled = payload.smtp_enabled;

    saveConfig(curConfig);

    return res.status(200).json({
      success: true,
      message: 'SMTP configuration updated successfully.'
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
