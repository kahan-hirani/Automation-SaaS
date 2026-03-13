/**
 * WEBSITE_UPTIME handler
 *
 * Checks a website's availability using Puppeteer, measures response time,
 * classifies the result into HEALTHY / DEGRADED / UNHEALTHY, logs the result
 * and sends a health-based email notification.
 */

import puppeteer from "puppeteer";
import AutomationLog from "../models/automationLog.model.js";
import { sendEmail } from "../services/email.service.js";
import logger from "../utils/logger.util.js";

const HEALTH_LEVELS = {
  HEALTHY:   "healthy",
  DEGRADED:  "degraded",
  UNHEALTHY: "unhealthy",
};

const evaluateHealth = ({ httpStatus, responseTime, contentLength }) => {
  if (!httpStatus || httpStatus >= 400) {
    return { level: HEALTH_LEVELS.UNHEALTHY, reason: `HTTP status is ${httpStatus || "unknown"}` };
  }
  const reasons = [];
  if (responseTime >= 5000) reasons.push(`high response time (${responseTime}ms)`);
  if (!contentLength || contentLength <= 0) reasons.push("empty or missing content");

  if (reasons.length) {
    return { level: HEALTH_LEVELS.DEGRADED, reason: reasons.join(" and ") };
  }
  return { level: HEALTH_LEVELS.HEALTHY, reason: "all metrics within normal range" };
};

const buildEmail = ({ automation, url, title, httpStatus, executionTime, responseTime, contentLength, health }) => {
  const map = {
    [HEALTH_LEVELS.HEALTHY]: {
      icon: "✅", label: "Healthy",
      recommendation: "No action needed. The site is operating normally.",
    },
    [HEALTH_LEVELS.DEGRADED]: {
      icon: "⚠️", label: "Degraded",
      recommendation: "Review server performance, upstream dependencies, and recent deployments.",
    },
    [HEALTH_LEVELS.UNHEALTHY]: {
      icon: "🚨", label: "Unhealthy",
      recommendation: "Immediate investigation recommended. Check hosting, DNS/CDN, and origin health.",
    },
  };
  const cfg = map[health.level] || map[HEALTH_LEVELS.UNHEALTHY];
  return {
    subject: `${cfg.icon} "${automation.name}" Health Check: ${cfg.label}`,
    html: `
      <h2>${cfg.icon} Website Health Check: ${cfg.label}</h2>
      <p><strong>Name:</strong> ${automation.name}</p>
      <p><strong>URL:</strong> ${url}</p>
      <p><strong>Page Title:</strong> ${title}</p>
      <p><strong>HTTP Status:</strong> ${httpStatus}</p>
      <p><strong>Execution Time:</strong> ${executionTime}ms</p>
      <p><strong>Response Time:</strong> ${responseTime}ms</p>
      <p><strong>Content Length:</strong> ${contentLength} bytes</p>
      <p><strong>Health Reason:</strong> ${health.reason}</p>
      <p><strong>Recommendation:</strong> ${cfg.recommendation}</p>
    `,
  };
};

/**
 * @param {object} automation  – Automation model instance (with User association)
 * @param {object} job         – BullMQ job object
 * @param {number} startTime   – epoch ms when the worker started
 */
export const runUptimeHandler = async (automation, job, startTime) => {
  const url = automation.config?.url || automation.targetUrl;
  if (!url) throw new Error("No URL configured for WEBSITE_UPTIME automation");

  let browser;
  const launchStart = Date.now();

  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    const title = await page.title();
    const httpStatus = response.status();
    const contentLength = parseInt(response.headers()["content-length"] || "0", 10);

    await browser.close();

    const executionTime = Date.now() - startTime;
    const responseTime  = Date.now() - launchStart;
    const health = evaluateHealth({ httpStatus, responseTime, contentLength });

    await AutomationLog.create({
      automationId: automation.id,
      status: "success",
      result: { title, httpStatus, contentLength, executionTime, responseTime, health },
    });

    logger.info(`[UPTIME] ${automation.id} • ${health.level} • ${executionTime}ms`);

    if (automation.User?.email) {
      const { subject, html } = buildEmail({ automation, url, title, httpStatus, executionTime, responseTime, contentLength, health });
      await sendEmail({ to: automation.User.email, subject, html });
    }

  } catch (error) {
    if (browser) await browser.close();
    throw error; // let the worker handle retry / failure log
  }
};
