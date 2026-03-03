import { getQueueMetrics, getExecutionMetrics } from "../services/metrics.service.js";
import asyncHandler from "../utils/asyncHandler.util.js";

/**
 * Get system metrics (Admin only - for now public for demo)
 */
const getMetrics = asyncHandler(async (req, res, next) => {
  const timeRange = req.query.timeRange || '24h';
  
  const [queueMetrics, executionMetrics] = await Promise.all([
    getQueueMetrics(),
    getExecutionMetrics(timeRange)
  ]);

  res.status(200).json({
    success: true,
    metrics: {
      queue: queueMetrics,
      executions: executionMetrics
    }
  });
});

export { getMetrics };
