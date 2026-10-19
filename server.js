// Campus2Career Unified Enterprise Server
// Serves static assets, video streams with security headers, and PostgreSQL / Supabase API endpoints
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Core Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Security Headers (Fixes YouTube embed Error 153 & enforces strict origin policies)
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Helper: Wrap serverless handlers for Express execution
const adapt = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[Handler Error: ${req.method} ${req.url}]`, err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

// 3. API Route Bindings
app.all('/api/admin/login', adapt(require('./api/admin/login')));
app.all('/api/admin/session', adapt(require('./api/admin/session')));
app.all('/api/admin/logout', adapt(require('./api/admin/logout')));
app.all('/api/admin/users', adapt(require('./api/admin/users')));

app.all('/api/recruiter/signals', adapt(require('./api/recruiter/signals')));
app.all('/api/recruiter/invite', adapt(require('./api/recruiter/invite')));
app.all('/api/recruiter/candidates', adapt(require('./api/recruiter/candidates')));

app.all('/api/candidates', adapt(require('./api/candidates')));
app.all('/api/news', adapt(require('./api/news')));
app.all('/api/register', adapt(require('./api/register')));
app.all('/api/login', adapt(require('./api/login')));
app.all('/api/logout', adapt(require('./api/logout')));
app.all('/api/me', adapt(require('./api/me')));
app.all('/api/verify-pin', adapt(require('./api/verify-pin')));
app.all('/api/verify-email', adapt(require('./api/verify-email')));
app.all('/api/send-email', adapt(require('./api/send-email')));
app.all('/api/emails', adapt(require('./api/emails')));
app.all('/api/smtp-config', adapt(require('./api/smtp-config')));
app.all('/api/mcq/submit', adapt(require('./api/mcq/submit')));
app.all('/api/student/log-activity', adapt(require('./api/student/log-activity')));
app.all('/api/student/activity', adapt(require('./api/student/activity')));

// Fallback dynamic API handler
app.all('/api/:mod', (req, res, next) => {
  const modPath = path.join(__dirname, 'api', `${req.params.mod}.js`);
  if (fs.existsSync(modPath)) {
    return adapt(require(modPath))(req, res, next);
  }
  res.status(404).json({ success: false, error: `API endpoint /api/${req.params.mod} not found.` });
});

// 4. Static File Hosting
app.use(express.static(path.join(__dirname)));

// 5. Client Route Rewrites (Single-Page App Navigation)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const p = req.path;
    if (p.startsWith('/dashboard') || p.startsWith('/recruiter') || p.startsWith('/login') || p.startsWith('/signup') || p.startsWith('/verify')) {
      return res.sendFile(path.join(__dirname, 'index.html'));
    }
  }
  next();
});

// 6. Global Catch-All
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// 7. Server Listener with automatic port fallback
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('=================================================================');
    console.log(`🚀 Campus2Career Enterprise Platform is LIVE`);
    console.log(`🌐 Local URL:       http://localhost:${port}`);
    console.log(`🔐 Admin Portal:   http://localhost:${port}#adminModal`);
    console.log(`💼 Recruiter Hub:  http://localhost:${port}/recruiter`);
    console.log(`📡 Database Mode:  ${process.env.POSTGRES_URL ? 'Supabase PostgreSQL (Connected)' : 'Local High-Reliability Fallback Store (Active)'}`);
    console.log('=================================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} in use, attempting port ${port + 1}...]`);
      startServer(port + 1);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

startServer(PORT);
