const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

dotenv.config();

const logger = require('./lib/logger');

// ─── Sentry (optional) ────────────────────────────────────
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
    environment: process.env.NODE_ENV || 'development',
  });
  logger.info('Sentry initialized');
} else {
  logger.warn('SENTRY_DSN not set — Sentry disabled');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust first proxy (Render, Vercel, etc.) for correct IP in rate limiting
app.set('trust proxy', 1);

// CORS - sadece izin verilen origin'ler (helmet'tan ÖNCE olmalı)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://subtrack-eta.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ].filter(Boolean);

    // Also allow any vercel.app preview deployments for this project
    if (origin.endsWith('.vercel.app') || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Preflight (OPTIONS) isteklerini tüm route'lar için aç
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Security Middleware (CORS'tan SONRA)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

// Rate Limiting - DDoS ve brute force koruması
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına max 100 istek
  message: { message: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth için daha sıkı rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // IP başına max 10 login/register denemesi
  message: { message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email gönderimi için sıkı limit
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // Saatte max 3 email gönderimi
  message: { message: 'Çok fazla e-posta gönderimi. Lütfen 1 saat sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);
app.use(express.json({ limit: '10kb' })); // JSON payload sınırı
app.use(cookieParser());

// Request Logger Middleware (structured with Pino)
app.use((req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    }, 'request');
    originalEnd.apply(res, args);
  };
  next();
});

// Routes with rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', emailLimiter);
app.use('/api/auth/resend-verification', emailLimiter);
app.use('/api/auth/google/callback', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => {
  res.send('Subscription Tracker API is running');
});

// Health Check Endpoint (no env details exposed)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (Sentry) Sentry.captureException(err);
  logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled server error');
  res.status(500).json({ message: 'Sunucu hatası oluştu' });
});

// Init Cron Jobs
require('./services/cron')();

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, '🚀 Server started');
  logger.info('🔒 Security: Helmet, CORS, Rate Limiting enabled');
});
