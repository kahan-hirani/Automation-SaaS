import { isValidCron } from "cron-validator";

import Automation from "../models/automation.model.js";
import User from "../models/user.model.js";
import errorHandler from "../utils/errorHandler.util.js";
import logger from "../utils/logger.util.js";
import { AUTOMATION_TYPES, REQUIRED_CONFIG_FIELDS } from "../utils/automationTypes.js";

// Plan-based limits
const PLAN_LIMITS = {
  free: 5,
  pro: 50,
  enterprise: 500
};

const createAutomationService = async (userId, data) => {
  const { name, schedule, automationType, config, targetUrl } = data || {};

  // ── Basic presence checks ───────────────────────────────────────────────────
  if (!name)     throw new errorHandler("name is required", 400);
  if (!schedule) throw new errorHandler("schedule is required", 400);

  if (!isValidCron(schedule)) {
    throw new errorHandler("Invalid cron schedule", 400);
  }

  // ── Automation type ─────────────────────────────────────────────────────────
  const resolvedType = automationType || AUTOMATION_TYPES.WEBSITE_UPTIME;

  if (!AUTOMATION_TYPES[resolvedType]) {
    throw new errorHandler(
      `Invalid automationType. Supported values: ${Object.values(AUTOMATION_TYPES).join(", ")}`,
      400
    );
  }

  // ── Config validation ───────────────────────────────────────────────────────
  const resolvedConfig = config || {};

  // Legacy support: WEBSITE_UPTIME created with bare targetUrl field
  if (resolvedType === AUTOMATION_TYPES.WEBSITE_UPTIME && !resolvedConfig.url && targetUrl) {
    resolvedConfig.url = targetUrl;
  }

  const requiredFields = REQUIRED_CONFIG_FIELDS[resolvedType] || [];
  for (const field of requiredFields) {
    if (resolvedConfig[field] == null || resolvedConfig[field] === "") {
      throw new errorHandler(`config.${field} is required for ${resolvedType}`, 400);
    }
  }

  // Validate URL fields
  const urlFields = ["url"];
  for (const field of urlFields) {
    if (resolvedConfig[field]) {
      try {
        new URL(resolvedConfig[field]);
      } catch {
        throw new errorHandler(`config.${field} must be a valid URL`, 400);
      }
    }
  }

  if (resolvedType === AUTOMATION_TYPES.PRICE_MONITOR) {
    const tp = parseFloat(resolvedConfig.targetPrice);
    if (Number.isNaN(tp) || tp <= 0) {
      throw new errorHandler("config.targetPrice must be a positive number", 400);
    }
  }

  // ── Plan limit ──────────────────────────────────────────────────────────────
  const user = await User.findByPk(userId);
  if (!user) throw new errorHandler("User not found", 404);

  const userPlan = user.plan || "free";
  const limit = PLAN_LIMITS[userPlan];

  const count = await Automation.count({ where: { userId } });

  if (count >= limit) {
    logger.warn(`User ${userId} reached automation limit for ${userPlan} plan`);
    throw new errorHandler(
      `Automation limit reached for ${userPlan} plan (${limit} automations). Upgrade to create more.`,
      400
    );
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  const automation = await Automation.create({
    userId,
    name,
    // Keep targetUrl populated for WEBSITE_UPTIME (backward compat with logs/UI queries)
    targetUrl: resolvedConfig.url || targetUrl || null,
    schedule,
    automationType: resolvedType,
    config: resolvedConfig,
    automationState: {},
  });

  logger.info(`Automation created: ${automation.id} (${resolvedType}) by user: ${userId}`);

  return automation;
};

const getAutomationService = async (userId, automationId) => {
  const automation = await Automation.findOne({ where: { id: automationId, userId } });
  return automation;
};

const updateAutomationService = async (userId, automationId, data) => {
  const automation = await Automation.findOne({ where: { id: automationId, userId } });
  if (!automation) {
    throw new errorHandler("Automation not found", 404);
  }
  await automation.update(data);
  return automation;
};

const deleteAutomationService = async (userId, automationId) => {
  const automation = await Automation.findOne({ where: { id: automationId, userId } });
  if (!automation) {
    throw new errorHandler("Automation not found", 404);
  }
  await automation.destroy();
  return true;
};

const getAllAutomationsService = async (userId) => {
  const automations = await Automation.findAll({ where: { userId } });
  return automations;
};

export { createAutomationService, getAutomationService, updateAutomationService, getAllAutomationsService, deleteAutomationService };
