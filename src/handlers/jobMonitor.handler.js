/**
 * JOB_MONITOR handler
 *
 * Scrapes a careers page, counts listing elements matching a CSS selector,
 * compares with the previous run count and alerts the user when new jobs appear.
 *
 * Config shape:
 *   { url: string, selector: string, keyword?: string }
 *
 * automationState shape:
 *   { lastJobCount: number, lastJobTitles: string[] }
 */

import puppeteer from "puppeteer";
import AutomationLog from "../models/automationLog.model.js";
import { sendEmail } from "../services/email.service.js";
import logger from "../utils/logger.util.js";

export const runJobMonitorHandler = async (automation, job, startTime) => {
  const { url, selector, keyword } = automation.config || {};

  if (!url)      throw new Error("config.url is required for JOB_MONITOR");
  if (!selector) throw new Error("config.selector is required for JOB_MONITOR");

  const lastJobCount  = automation.automationState?.lastJobCount  ?? null;
  const lastJobTitles = automation.automationState?.lastJobTitles ?? [];

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Allow JS-rendered content to settle
    await page.waitForSelector(selector, { timeout: 10000 }).catch(() => null);

    // Extract all matching element text contents
    const jobTitles = await page.$$eval(selector, (elements) =>
      elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );

    await browser.close();

    const executionTime = Date.now() - startTime;

    // Optional keyword filter
    const filteredTitles = keyword
      ? jobTitles.filter((title) => title.toLowerCase().includes(keyword.toLowerCase()))
      : jobTitles;

    const currentCount = filteredTitles.length;
    const newJobs = lastJobCount !== null && currentCount > lastJobCount
      ? filteredTitles.filter((t) => !lastJobTitles.includes(t))
      : [];
    const newJobsDetected = newJobs.length > 0;

    const result = {
      jobsFound: currentCount,
      previousCount: lastJobCount,
      newJobsDetected,
      newJobs,
      keyword: keyword || null,
      executionTime,
    };

    await AutomationLog.create({
      automationId: automation.id,
      status: "success",
      result,
    });

    // Persist state for next run
    await automation.update({
      automationState: {
        ...automation.automationState,
        lastJobCount: currentCount,
        lastJobTitles: filteredTitles,
      },
    });

    logger.info(`[JOB_MONITOR] ${automation.id} • jobsFound=${currentCount} newJobs=${newJobs.length}`);

    if (newJobsDetected && automation.User?.email) {
      await sendEmail({
        to: automation.User.email,
        subject: `🆕 New Jobs Found: "${automation.name}" (${newJobs.length} new)`,
        html: `
          <h2>🆕 New Job Listings Detected!</h2>
          <p><strong>Automation:</strong> ${automation.name}</p>
          <p><strong>Careers Page:</strong> <a href="${url}">${url}</a></p>
          ${keyword ? `<p><strong>Keyword Filter:</strong> ${keyword}</p>` : ""}
          <p><strong>Total Jobs Found:</strong> ${currentCount}</p>
          <p><strong>New This Run:</strong> ${newJobs.length}</p>
          <ul>
            ${newJobs.map((title) => `<li>${title}</li>`).join("\n")}
          </ul>
          <p>Visit the careers page to apply before positions are filled.</p>
        `,
      });
    } else if (!newJobsDetected && lastJobCount !== null && currentCount < lastJobCount) {
      // Listings dropped — also worth notifying
      if (automation.User?.email) {
        await sendEmail({
          to: automation.User.email,
          subject: `📉 Job Listings Decreased: "${automation.name}"`,
          html: `
            <h2>📉 Job Count Decreased</h2>
            <p><strong>Automation:</strong> ${automation.name}</p>
            <p><strong>Careers Page:</strong> <a href="${url}">${url}</a></p>
            <p><strong>Previous Count:</strong> ${lastJobCount}</p>
            <p><strong>Current Count:</strong> ${currentCount}</p>
          `,
        });
      }
    }

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};
