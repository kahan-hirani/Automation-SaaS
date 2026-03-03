import express from 'express';
import { getAutomationLogs, getAllUserLogs, getLogStats } from '../controllers/log.controller.js';
import isAuthenticated from '../middlewares/auth.middleware.js';

const router = express.Router();

// All log routes require authentication
router.use(isAuthenticated);

// Get all logs for user's automations
router.get('/', getAllUserLogs);

// Get statistics
router.get('/stats', getLogStats);

// Get logs for specific automation
router.get('/:automationId', getAutomationLogs);

export default router;
