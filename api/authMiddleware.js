// Authentication & Guard Middleware for Campus2Career
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'campus2career_enterprise_super_secret_jwt_key_2026';
const ADMIN_COOKIE_NAME = 'admin_session';

function parseCookies(req) {
  const cookieHeader = req.headers && req.headers.cookie;
  if (!cookieHeader) return {};
  if (typeof cookie.parseCookie === 'function') {
    return cookie.parseCookie(cookieHeader);
  }
  if (typeof cookie.parse === 'function') {
    return cookie.parse(cookieHeader);
  }
  // Fallback parsing
  const list = {};
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
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
  let serialized;
  if (typeof cookie.stringifySetCookie === 'function') {
    serialized = cookie.stringifySetCookie({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'Strict',
      maxAge: 8 * 60 * 60, // 8 hours in seconds
      path: '/'
    });
  } else if (typeof cookie.serialize === 'function') {
    serialized = cookie.serialize(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60,
      path: '/'
    });
  } else {
    serialized = `${ADMIN_COOKIE_NAME}=${token}; Max-Age=28800; Path=/; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
}

function clearAdminCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized;
  if (typeof cookie.stringifySetCookie === 'function') {
    serialized = cookie.stringifySetCookie({
      name: ADMIN_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Strict',
      maxAge: 0,
      path: '/'
    });
  } else if (typeof cookie.serialize === 'function') {
    serialized = cookie.serialize(ADMIN_COOKIE_NAME, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
  } else {
    serialized = `${ADMIN_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
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
      role: user.role || 'learner',
      stream: user.stream || 'IT'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setUserCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized;
  if (typeof cookie.stringifySetCookie === 'function') {
    serialized = cookie.stringifySetCookie({
      name: USER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });
  } else if (typeof cookie.serialize === 'function') {
    serialized = cookie.serialize(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });
  } else {
    serialized = `${USER_COOKIE_NAME}=${token}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
}

function clearUserCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  let serialized;
  if (typeof cookie.stringifySetCookie === 'function') {
    serialized = cookie.stringifySetCookie({
      name: USER_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: isProd,
      sameSite: 'Lax',
      maxAge: 0,
      path: '/'
    });
  } else if (typeof cookie.serialize === 'function') {
    serialized = cookie.serialize(USER_COOKIE_NAME, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
  } else {
    serialized = `${USER_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  }
  res.setHeader('Set-Cookie', serialized);
}

function verifyUser(req) {
  const cookies = parseCookies(req);
  let token = cookies[USER_COOKIE_NAME];

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
