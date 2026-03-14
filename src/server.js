import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import sequelize from './config/database.js';
import errorMiddleware from './middlewares/error.middlware.js';
import indexRoutes from './routes/index.routes.js';
import { generalLimiter } from './middlewares/rateLimit.middleware.js';
import logger from './utils/logger.util.js';
import "./schedulers/cron.scheduler.js";
import "./services/metrics.service.js";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── CORS ────────────────────────────────────────────────────────────────────
// Must be registered FIRST — before helmet, rate limiter, and all routes.
// Otherwise preflight OPTIONS requests never receive Access-Control-Allow-Origin.
const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

if (isProduction && allowedOrigins.length === 0) {
  logger.warn('CORS_ORIGINS is not set in production — falling back to localhost origins. Set CORS_ORIGINS on Render.');
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.RUN_WORKER_IN_API === 'true' && process.env.VERCEL !== '1') {
  import('./workers/automation.worker.js')
    .then(() => logger.info('Worker started in API process'))
    .catch((err) => logger.error('Failed to start worker in API process', err));
}

sequelize.authenticate()
  .then(() => logger.info("Database connected successfully"))
  .catch(err => logger.error("Unable to connect to the database:", err));

sequelize.sync({ alter: !isProduction });

// Security middleware
app.use(helmet());

// Rate limiting
app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/', (req, res) => {
  res.send('Automation SaaS API - Production Ready');
});

app.use('/api/v1', indexRoutes);

app.use(errorMiddleware);

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`CORS allowed origins: ${corsOrigins.join(', ')}`);
  });
}

export default app;

