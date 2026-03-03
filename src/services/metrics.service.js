import automationQueue from '../queues/automation.queue.js';
import AutomationLog from '../models/automationLog.model.js';
import logger from '../utils/logger.util.js';
import { Op } from 'sequelize';

/**
 * Get queue metrics
 */
export const getQueueMetrics = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      automationQueue.getWaitingCount(),
      automationQueue.getActiveCount(),
      automationQueue.getCompletedCount(),
      automationQueue.getFailedCount(),
      automationQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  } catch (error) {
    logger.error('Failed to get queue metrics:', error);
    return null;
  }
};

/**
 * Get automation execution metrics
 */
export const getExecutionMetrics = async (timeRange = '24h') => {
  try {
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    const logs = await AutomationLog.findAll({
      where: {
        createdAt: {
          [Op.gte]: startTime
        }
      },
      attributes: ['status', 'result', 'error', 'createdAt']
    });

    const successLogs = logs.filter(l => l.status === 'success');
    const failedLogs = logs.filter(l => l.status === 'failed');

    // Calculate execution times
    const executionTimes = successLogs
      .map(l => l.result?.executionTime)
      .filter(t => t != null);

    const avgExecutionTime = executionTimes.length > 0
      ? Math.round(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length)
      : 0;

    const minExecutionTime = executionTimes.length > 0
      ? Math.min(...executionTimes)
      : 0;

    const maxExecutionTime = executionTimes.length > 0
      ? Math.max(...executionTimes)
      : 0;

    return {
      timeRange,
      total: logs.length,
      success: successLogs.length,
      failed: failedLogs.length,
      successRate: logs.length > 0 
        ? ((successLogs.length / logs.length) * 100).toFixed(2) + '%'
        : '0%',
      avgExecutionTime,
      minExecutionTime,
      maxExecutionTime
    };
  } catch (error) {
    logger.error('Failed to get execution metrics:', error);
    return null;
  }
};

/**
 * Log metrics periodically
 */
export const logMetrics = async () => {
  const queueMetrics = await getQueueMetrics();
  const execMetrics = await getExecutionMetrics('1h');

  logger.info('System Metrics', {
    queue: queueMetrics,
    executions: execMetrics
  });
};

// Log metrics every 5 minutes
setInterval(logMetrics, 5 * 60 * 1000);
