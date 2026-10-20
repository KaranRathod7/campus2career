// Authentication & Guard Middleware for Campus2Career
const jwt = require('jsonwebtoken');

let cookie = null;
try {
  cookie = require('cookie');
} catch (e) {
  // If cookie is an ES Module or not present, use robust internal fallback
  cookie = null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'campus2career_enterprise_super_secret_jwt_key_2026';
const ADMIN_COOKIE_NAME = 'admin_session';

function parseCookies(req) {
  const cookieHeader = req.headers && req.headers.cookie;
  if (!cookieHeader) return {};
  if (cookie && typeof cookie.parse === 'function') {
    try {
      return cookie.parse(cookieHeader);
    } catch (e) {}
  }
  // Native high-reliability parser
  const list = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      try {
        list[key] = decodeURIComponent(val);
      } catch (e) {
        list[key] = val;
      }
    }
  });
  return list;
}

function signAdminToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function setAdminCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized = null;
  if (cookie && typeof cookie.serialize === 'function') {
    try {
      serialized = cookie.serialize(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/'
      });
    } catch (e) {}
  }
  if (!serialized) {
    serialized = `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
}

function clearAdminCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized = null;
  if (cookie && typeof cookie.serialize === 'function') {
    try {
      serialized = cookie.serialize(ADMIN_COOKIE_NAME, '', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        expires: new Date(0),
        maxAge: 0,
        path: '/'
      });
    } catch (e) {}
  }
  if (!serialized) {
    serialized = `${ADMIN_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`;
  }
  
  let existing = null;
  if (typeof res.getHeader === 'function') {
    existing = res.getHeader('Set-Cookie') || res.getHeader('set-cookie');
  } else if (res.headers) {
    existing = res.headers['set-cookie'] || res.headers['Set-Cookie'];
  }

  if (!existing) {
    res.setHeader('Set-Cookie', serialized);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, serialized]);
  } else {
    res.setHeader('Set-Cookie', [existing, serialized]);
  }
}

// verifyAdmin backend guard function
function verifyAdmin(req) {
  const cookies = parseCookies(req);
  let token = cookies[ADMIN_COOKIE_NAME];

  // Also support Authorization header Bearer token
  if (!token && req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return { valid: false, error: 'No admin session token found in cookies or header.' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return { valid: false, error: 'Forbidden: Insufficient privileges. Admin role required.' };
    }
    return { valid: true, admin: decoded };
  } catch (err) {
    return { valid: false, error: `Invalid or expired admin session token: ${err.message}` };
  }
}

// Client IP extractor for rate limiting
function getClientIp(req) {
  const forwarded = req.headers ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) : null;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

const USER_COOKIE_NAME = 'c2c_jwt';

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username || null,
      role: user.role || 'learner',
      stream: user.stream || 'IT'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setUserCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized = null;
  if (cookie && typeof cookie.serialize === 'function') {
    try {
      serialized = cookie.serialize(USER_COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/'
      });
    } catch (e) {}
  }
  if (!serialized) {
    serialized = `${USER_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
}

function clearUserCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized = null;
  if (cookie && typeof cookie.serialize === 'function') {
    try {
      serialized = cookie.serialize(USER_COOKIE_NAME, '', {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        expires: new Date(0),
        maxAge: 0,
        path: '/'
      });
    } catch (e) {}
  }
  if (!serialized) {
    serialized = `${USER_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  }

  let existing = null;
  if (typeof res.getHeader === 'function') {
    existing = res.getHeader('Set-Cookie') || res.getHeader('set-cookie');
  } else if (res.headers) {
    existing = res.headers['set-cookie'] || res.headers['Set-Cookie'];
  }

  if (!existing) {
    res.setHeader('Set-Cookie', serialized);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, serialized]);
  } else {
    res.setHeader('Set-Cookie', [existing, serialized]);
  }
}

function verifyUser(req) {
  const cookies = parseCookies(req);
  let token = cookies[USER_COOKIE_NAME] || cookies['token'];

  if (!token && req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return { valid: false, error: 'No user session token found.' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (err) {
    return { valid: false, error: `Invalid or expired session token: ${err.message}` };
  }
}

module.exports = {
  JWT_SECRET,
  ADMIN_COOKIE_NAME,
  USER_COOKIE_NAME,
  parseCookies,
  signAdminToken,
  setAdminCookie,
  clearAdminCookie,
  verifyAdmin,
  signUserToken,
  setUserCookie,
  clearUserCookie,
  verifyUser,
  getClientIp
};
