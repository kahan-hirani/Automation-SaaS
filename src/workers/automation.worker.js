import { Worker } from "bullmq";
import redis from "../config/redis.js";
import Automation from "../models/automation.model.js";
import AutomationLog from "../models/automationLog.model.js";
import User from "../models/user.model.js";
import puppeteer from "puppeteer";
import { sendEmail } from "../services/email.service.js";
import logger from "../utils/logger.util.js";

const HEALTH_LEVELS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy"
};

const evaluateWebsiteHealth = ({ httpStatus, responseTime, contentLength }) => {
  const hasErrorStatus = !httpStatus || httpStatus >= 400;
  const isSlow = responseTime >= 5000;
  const hasNoContent = !contentLength || Number.isNaN(contentLength) || contentLength <= 0;

  if (hasErrorStatus) {
    return {
      level: HEALTH_LEVELS.UNHEALTHY,
      reason: `HTTP status is ${httpStatus || "unknown"}`
    };
  }

  if (isSlow || hasNoContent) {
    const reasons = [];
    if (isSlow) reasons.push(`high response time (${responseTime}ms)`);
    if (hasNoContent) reasons.push("empty or missing content");

    return {
      level: HEALTH_LEVELS.DEGRADED,
      reason: reasons.join(" and ")
    };
  }

  return {
    level: HEALTH_LEVELS.HEALTHY,
    reason: "status and response metrics are within expected range"
  };
};

const buildHealthEmail = ({ automation, title, httpStatus, executionTime, responseTime, contentLength, health }) => {
  const healthMap = {
    [HEALTH_LEVELS.HEALTHY]: {
      icon: "✅",
      label: "Healthy",
      subject: `✅ Automation "${automation.name}" Health Check: Healthy`,
      recommendation: "No action needed. The site appears to be operating normally."
    },
    [HEALTH_LEVELS.DEGRADED]: {
      icon: "⚠️",
      label: "Degraded",
      subject: `⚠️ Automation "${automation.name}" Health Check: Degraded`,
      recommendation: "Review server performance, upstream dependencies, and recent deployment changes."
    },
    [HEALTH_LEVELS.UNHEALTHY]: {
      icon: "🚨",
      label: "Unhealthy",
      subject: `🚨 Automation "${automation.name}" Health Check: Unhealthy`,
      recommendation: "Immediate investigation is recommended. Check hosting, DNS/CDN, and origin server health."
    }
  };

  const config = healthMap[health.level] || healthMap[HEALTH_LEVELS.UNHEALTHY];

  return {
    subject: config.subject,
    html: `
      <h2>${config.icon} Website Health Check: ${config.label}</h2>
      <p><strong>Name:</strong> ${automation.name}</p>
      <p><strong>URL:</strong> ${automation.targetUrl}</p>
      <p><strong>Page Title:</strong> ${title}</p>
      <p><strong>HTTP Status:</strong> ${httpStatus}</p>
      <p><strong>Execution Time:</strong> ${executionTime}ms</p>
      <p><strong>Response Time:</strong> ${responseTime}ms</p>
      <p><strong>Content Length:</strong> ${contentLength}</p>
      <p><strong>Health Reason:</strong> ${health.reason}</p>
      <p><strong>Recommendation:</strong> ${config.recommendation}</p>
    `
  };
};

const worker = new Worker(
  "automationQueue",
  async (job) => {
    const startTime = Date.now();
    const { automationId } = job.data;

    logger.info(`Starting automation job: ${automationId}, attempt: ${job.attemptsMade + 1}`);

    const automation = await Automation.findByPk(automationId, {
      include: [{ model: User, attributes: ['email', 'id'] }]
    });

    if (!automation || !automation.isActive) {
      logger.warn(`Automation ${automationId} not found or inactive`);
      return;
    }

    let browser;
    try {
      const launchStart = Date.now();
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();

      // Navigate and track response
      const response = await page.goto(automation.targetUrl, { 
        waitUntil: "networkidle2",
        timeout: 30000
      });

      const title = await page.title();
      const httpStatus = response.status();
      const contentLength = response.headers()['content-length'] || 0;
      
      await browser.close();
      
      const executionTime = Date.now() - startTime;
      const responseTime = Date.now() - launchStart;
      const parsedContentLength = parseInt(contentLength, 10) || 0;
      const health = evaluateWebsiteHealth({
        httpStatus,
        responseTime,
        contentLength: parsedContentLength
      });

      // Log success with metadata
      await AutomationLog.create({
        automationId: automation.id,
        status: "success",
        result: { 
          title,
          httpStatus,
          contentLength: parsedContentLength,
          executionTime,
          responseTime,
          health
        }
      });

      logger.info(`Automation ${automationId} completed in ${executionTime}ms with health=${health.level}`);

      // Send health-based email
      if (automation.User && automation.User.email) {
        const { subject, html } = buildHealthEmail({
          automation,
          title,
          httpStatus,
          executionTime,
          responseTime,
          contentLength: parsedContentLength,
          health
        });

        await sendEmail({
          to: automation.User.email,
          subject,
          html
        });
      }

    } catch (error) {
      if (browser) await browser.close();
      
      const executionTime = Date.now() - startTime;
      const isLastAttempt = job.attemptsMade >= 2; // 3 attempts (0, 1, 2)

      logger.error(`Automation ${automationId} failed: ${error.message}`, {
        attempt: job.attemptsMade + 1,
        error: error.stack
      });

      // Log failure with metadata
      await AutomationLog.create({
        automationId: automation.id,
        status: "failed",
        error: error.message,
        result: {
          executionTime,
          attempt: job.attemptsMade + 1,
          errorType: error.name
        }
      });

      // Send failure email only on last attempt
      if (isLastAttempt && automation.User && automation.User.email) {
        await sendEmail({
          to: automation.User.email,
          subject: `❌ Automation "${automation.name}" Failed`,
          html: `
            <h2>Automation Failed After 3 Attempts</h2>
            <p><strong>Name:</strong> ${automation.name}</p>
            <p><strong>URL:</strong> ${automation.targetUrl}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Please check your automation configuration.</strong></p>
          `
        });
      }

      throw error; // Re-throw to trigger retry
    }
  },
  {
    connection: redis,
    concurrency: 3,
    // Retry configuration with exponential backoff
    settings: {
      backoffStrategy: (attemptsMade) => {
        return Math.min(Math.pow(2, attemptsMade) * 2000, 30000);
      }
    }
  }
);

export default worker;