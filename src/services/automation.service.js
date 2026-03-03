import { isValidCron } from "cron-validator";

import Automation from "../models/automation.model.js";
import User from "../models/user.model.js";
import errorHandler from "../utils/errorHandler.util.js";
import logger from "../utils/logger.util.js";

// Plan-based limits
const PLAN_LIMITS = {
  free: 5,
  pro: 50,
  enterprise: 500
};

const createAutomationService = async (userId, data) => {
  const { name, targetUrl, schedule } = data || {};

  if (!name || !targetUrl || !schedule) {
    throw new errorHandler("name, targetUrl and schedule are required", 400);
  }
  try {
    new URL(targetUrl);
  } catch (err) {
    throw new errorHandler("Invalid targetUrl", 400);
  }

  if (!isValidCron(schedule)) {
    throw new errorHandler("Invalid cron schedule", 400);
  }

  // Get user's plan
  const user = await User.findByPk(userId);
  if (!user) {
    throw new errorHandler("User not found", 404);
  }

  const userPlan = user.plan || 'free';
  const limit = PLAN_LIMITS[userPlan];

  const count = await Automation.count({ where: { userId } });

  if (count >= limit) {
    logger.warn(`User ${userId} reached automation limit for ${userPlan} plan`);
    throw new errorHandler(
      `Automation limit reached for ${userPlan} plan (${limit} automations). Upgrade to create more.`, 
      400
    );
  }

  const automation = await Automation.create({
    userId,
    name,
    targetUrl,
    schedule,
  });

  logger.info(`Automation created: ${automation.id} by user: ${userId}`);

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
