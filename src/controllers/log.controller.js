import { Automation, AutomationLog } from "../models/index.model.js";
import asyncHandler from "../utils/asyncHandler.util.js";
import errorHandler from "../utils/errorHandler.util.js";

/**
 * Get logs for a specific automation (with ownership check)
 */
const getAutomationLogs = asyncHandler(async (req, res, next) => {
  const { automationId } = req.params;
  const userId = req.user.id;

  // Verify ownership
  const automation = await Automation.findOne({
    where: { id: automationId, userId }
  });

  if (!automation) {
    throw new errorHandler("Automation not found or access denied", 404);
  }

  const logs = await AutomationLog.findAll({
    where: { automationId },
    order: [['createdAt', 'DESC']],
    limit: parseInt(req.query.limit) || 50
  });

  res.status(200).json({
    success: true,
    count: logs.length,
    logs
  });
});

/**
 * Get all logs for user's automations
 */
const getAllUserLogs = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  // Get all user's automation IDs
  const automations = await Automation.findAll({
    where: { userId },
    attributes: ['id']
  });

  const automationIds = automations.map(a => a.id);

  const logs = await AutomationLog.findAll({
    where: { automationId: automationIds },
    include: [{
      model: Automation,
      attributes: ['name', 'targetUrl']
    }],
    order: [['createdAt', 'DESC']],
    limit: parseInt(req.query.limit) || 100
  });

  res.status(200).json({
    success: true,
    count: logs.length,
    logs
  });
});

/**
 * Get log statistics for user
 */
const getLogStats = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  // Get all user's automation IDs
  const automations = await Automation.findAll({
    where: { userId },
    attributes: ['id']
  });

  const automationIds = automations.map(a => a.id);

  const logs = await AutomationLog.findAll({
    where: { automationId: automationIds },
    attributes: ['status', 'result', 'createdAt']
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    avgExecutionTime: 0
  };

  // Calculate average execution time
  const executionTimes = logs
    .map(l => l.result?.executionTime)
    .filter(t => t != null);

  if (executionTimes.length > 0) {
    stats.avgExecutionTime = Math.round(
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
    );
  }

  res.status(200).json({
    success: true,
    stats
  });
});

export { getAutomationLogs, getAllUserLogs, getLogStats };
