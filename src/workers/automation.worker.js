import { Worker } from "bullmq";
import redis from "../config/redis.js";
import Automation from "../models/automation.model.js";
import AutomationLog from "../models/automationLog.model.js";
import puppeteer from "puppeteer";

const worker = new Worker(
  "automationQueue",
  async (job) => {

    const { automationId } = job.data;

    const automation = await Automation.findByPk(automationId);

    if (!automation || !automation.isActive) {
      return;
    }

    try {

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(automation.targetUrl, { waitUntil: "networkidle2" });

      const title = await page.title();

      await browser.close();

      await AutomationLog.create({
        automationId: automation.id,
        status: "success",
        result: { title }
      });

    } catch (error) {

      await AutomationLog.create({
        automationId: automation.id,
        status: "failed",
        error: error.message
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3
  }
);

export default worker;