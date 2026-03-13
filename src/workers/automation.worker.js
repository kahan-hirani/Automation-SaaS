import { Worker } from "bullmq";
import redis from "../config/redis.js";
import Automation from "../models/automation.model.js";
import AutomationLog from "../models/automationLog.model.js";
import User from "../models/user.model.js";
import { sendEmail } from "../services/email.service.js";
import logger from "../utils/logger.util.js";
import { AUTOMATION_TYPES, AUTOMATION_TYPE_LABELS } from "../utils/automationTypes.js";

// Handler imports — add a new import here when you create a new handler
import { runUptimeHandler }       from "../handlers/uptime.handler.js";
import { runPriceMonitorHandler } from "../handlers/priceMonitor.handler.js";
import { runJobMonitorHandler }   from "../handlers/jobMonitor.handler.js";

/**
 * Route an automation job to the appropriate handler.
 * Each handler signature: (automation, job, startTime) => Promise<void>
 */
const HANDLER_MAP = {
  [AUTOMATION_TYPES.WEBSITE_UPTIME]: runUptimeHandler,
  [AUTOMATION_TYPES.PRICE_MONITOR]:  runPriceMonitorHandler,
  [AUTOMATION_TYPES.JOB_MONITOR]:    runJobMonitorHandler,
};

const worker = new Worker(
  "automationQueue",
  async (job) => {
    const startTime = Date.now();
    const { automationId } = job.data;

    logger.info(`[Worker] Job started: ${automationId} | attempt ${job.attemptsMade + 1}`);

    const automation = await Automation.findByPk(automationId, {
      include: [{ model: User, attributes: ["email", "id"] }],
    });

    if (!automation || !automation.isActive) {
      logger.warn(`[Worker] Automation ${automationId} not found or inactive — skipping`);
      return;
    }

    const handler = HANDLER_MAP[automation.automationType];

    if (!handler) {
      const msg = `[Worker] Unknown automationType "${automation.automationType}" for ${automationId}`;
      logger.error(msg);
      await AutomationLog.create({
        automationId: automation.id,
        status: "failed",
        error: msg,
        result: { executionTime: Date.now() - startTime },
      });
      return; // do not retry — configuration error
    }

    try {
      await handler(automation, job, startTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const isLastAttempt = job.attemptsMade >= 2;
      const typeLabel = AUTOMATION_TYPE_LABELS[automation.automationType] || automation.automationType;

      logger.error(`[Worker] ${automationId} (${typeLabel}) failed: ${error.message}`, {
        attempt: job.attemptsMade + 1,
        stack: error.stack,
      });

      await AutomationLog.create({
        automationId: automation.id,
        status: "failed",
        error: error.message,
        result: {
          executionTime,
          attempt: job.attemptsMade + 1,
          errorType: error.name,
        },
      });

      if (isLastAttempt && automation.User?.email) {
        await sendEmail({
          to: automation.User.email,
          subject: `❌ Automation "${automation.name}" Failed After 3 Attempts`,
          html: `
            <h2>❌ Automation Failed</h2>
            <p><strong>Name:</strong> ${automation.name}</p>
            <p><strong>Type:</strong> ${typeLabel}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please check your automation configuration and ensure the target is reachable.</p>
          `,
        });
      }

      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: redis,
    concurrency: 3,
    settings: {
      backoffStrategy: (attemptsMade) => Math.min(Math.pow(2, attemptsMade) * 5000, 30000),
    },
  }
);

export default worker;