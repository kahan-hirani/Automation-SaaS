import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
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

sequelize.authenticate()
  .then(() => logger.info("Database connected successfully"))
  .catch(err => logger.error("Unable to connect to the database:", err));

sequelize.sync({ alter: true });

app.get('/', (req, res) => {
  res.send('Automation SaaS API - Production Ready');
});

// Security middleware
app.use(helmet());

// Rate limiting
app.use(generalLimiter);

// Body parser
app.use(express.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.use('/api/v1', indexRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
