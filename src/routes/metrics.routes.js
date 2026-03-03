import express from 'express';
import { getMetrics } from '../controllers/metrics.controller.js';
import isAuthenticated from '../middlewares/auth.middleware.js';

const router = express.Router();

// Protected metrics endpoint
router.get('/', isAuthenticated, getMetrics);

export default router;
