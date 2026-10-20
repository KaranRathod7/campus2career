// Campus2Career Consolidated Serverless Entry Point
// Routes all /api/* requests through this single Serverless Function on Vercel
const express = require('express');
const cors = require('cors');

const app = express();

// 1. Core Middlewares & CORS
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Security Headers (nosniff, strict referrer, XSS block)
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Guard against unhandled rejections crashing the serverless worker
if (!process.listeners('unhandledRejection').some(fn => fn.name === 'campus2careerRejectionHandler')) {
  process.on('unhandledRejection', function campus2careerRejectionHandler(reason) {
    console.warn('[Campus2Career Serverless Warning] Unhandled Rejection caught:', (reason && reason.message) || reason);
  });
}

// Helper: Wrap handler for Express execution
const adapt = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error(`[API Error: ${req.method} ${req.url}]`, err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: err.message,
        detail: err.detail || (err.stack ? err.stack.split('\n')[0] : undefined)
      });
    }
  }
};

const router = express.Router();

// Admin Suite Endpoints
router.all('/admin/login', adapt(require('./_handlers/admin/login')));
router.all('/admin/session', adapt(require('./_handlers/admin/session')));
router.all('/admin/logout', adapt(require('./_handlers/admin/logout')));
router.all('/admin/users', adapt(require('./_handlers/admin/users')));

// Recruiter Portal & Signals
router.all('/recruiter/signals', adapt(require('./_handlers/recruiter/signals')));
router.all('/recruiter/invite', adapt(require('./_handlers/recruiter/invite')));
router.all('/recruiter/candidates', adapt(require('./_handlers/recruiter/candidates')));

// Candidates Directory
router.all('/candidates', adapt(require('./_handlers/candidates')));

// Market Intelligence & News
router.all('/news', adapt(require('./_handlers/news')));

// Authentication & Profile
router.all('/register', adapt(require('./_handlers/register')));
router.all('/login', adapt(require('./_handlers/login')));
router.all('/logout', adapt(require('./_handlers/logout')));
router.all('/me', adapt(require('./_handlers/me')));
router.all('/auth/me', adapt(require('./_handlers/me')));
router.all('/auth/status', adapt(require('./_handlers/auth-status')));
router.all('/auth/logout', adapt(require('./_handlers/logout')));
router.all('/auth/login', adapt(require('./_handlers/login')));
router.all('/auth/register', adapt(require('./_handlers/register')));

// Verification & SMTP Dispatch
router.all('/verify-pin', adapt(require('./_handlers/verify-pin')));
router.all('/verify-email', adapt(require('./_handlers/verify-email')));
router.all('/send-email', adapt(require('./_handlers/send-email')));
router.all('/emails', adapt(require('./_handlers/emails')));
router.all('/smtp-config', adapt(require('./_handlers/smtp-config')));

// MCQ Diagnostic & Benchmark Submissions
router.all('/mcq/submit', adapt(require('./_handlers/mcq/submit')));

// Student Activity Pipeline & Live Stopwatch Tracking
router.all('/student/log-activity', adapt(require('./_handlers/student/log-activity')));
router.all('/student/activity', adapt(require('./_handlers/student/activity')));

// Health check
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'Campus2Career API', time: new Date().toISOString() }));

// Mount router on both '/api' and '/' to ensure full compatibility with Vercel rewrites
app.use('/api', router);
app.use('/', router);

// Global 404 for unhandled API calls
app.use((req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.url}` });
});

module.exports = app;
