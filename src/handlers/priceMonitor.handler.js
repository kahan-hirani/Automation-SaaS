/**
 * PRICE_MONITOR handler
 *
 * Navigates to a product page using Puppeteer, extracts the price via a CSS
 * selector, compares it to a configured target price, and alerts the user
 * when the current price is at or below the target.
 *
 * Config shape:
 *   { url: string, selector: string, targetPrice: number }
 *
 * automationState shape:
 *   { previousPrice: number | null }
 */

import puppeteer from "puppeteer";
import AutomationLog from "../models/automationLog.model.js";
import { sendEmail } from "../services/email.service.js";
import logger from "../utils/logger.util.js";

/**
 * Strips currency symbols, thousands separators and other non-numeric
 * characters so "₹1,850.00" or "$2,499" become parseable floats.
 */
const parsePrice = (raw) => {
  const cleaned = String(raw).replace(/[^\d.,]/g, "").replace(/,(?=\d{3})/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const runPriceMonitorHandler = async (automation, job, startTime) => {
  const { url, selector, targetPrice } = automation.config || {};

  if (!url)         throw new Error("config.url is required for PRICE_MONITOR");
  if (!selector)    throw new Error("config.selector is required for PRICE_MONITOR");
  if (targetPrice == null) throw new Error("config.targetPrice is required for PRICE_MONITOR");

  const parsedTarget = parseFloat(targetPrice);
  const previousPrice = automation.automationState?.previousPrice ?? null;

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();

    // Block images & fonts to speed up scraping
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for the price element to be present
    await page.waitForSelector(selector, { timeout: 10000 }).catch(() => null);

    const rawPriceText = await page.$eval(selector, (el) => el.textContent?.trim() || "").catch(() => null);
    const currentPrice = rawPriceText ? parsePrice(rawPriceText) : null;

    await browser.close();

    const executionTime = Date.now() - startTime;
    const priceDrop = currentPrice !== null && currentPrice <= parsedTarget;
    const priceChanged = previousPrice !== null && currentPrice !== null && currentPrice !== previousPrice;

    const result = {
      currentPrice,
      previousPrice,
      targetPrice: parsedTarget,
      priceDrop,
      priceChanged,
      rawPriceText,
      executionTime,
    };

    await AutomationLog.create({
      automationId: automation.id,
      status: "success",
      result,
    });

    // Persist the current price for next run
    await automation.update({
      automationState: { ...automation.automationState, previousPrice: currentPrice },
    });

    logger.info(`[PRICE_MONITOR] ${automation.id} • currentPrice=${currentPrice} targetPrice=${parsedTarget} priceDrop=${priceDrop}`);

    // Alert when price is at or below target
    if (priceDrop && automation.User?.email) {
      await sendEmail({
        to: automation.User.email,
        subject: `🎯 Price Drop Alert: "${automation.name}"`,
        html: `
          <h2>🎯 Price Drop Detected!</h2>
          <p><strong>Automation:</strong> ${automation.name}</p>
          <p><strong>Product URL:</strong> <a href="${url}">${url}</a></p>
          <p><strong>Current Price:</strong> ${rawPriceText} (parsed: ${currentPrice})</p>
          <p><strong>Your Target Price:</strong> ${parsedTarget}</p>
          ${previousPrice !== null ? `<p><strong>Previous Price:</strong> ${previousPrice}</p>` : ""}
          <p>The price has reached your target. Now may be a good time to buy!</p>
        `,
      });
    }

    // Also alert if price changed (even if above target) — informational
    if (!priceDrop && priceChanged && automation.User?.email) {
      await sendEmail({
        to: automation.User.email,
        subject: `📊 Price Update: "${automation.name}"`,
        html: `
          <h2>📊 Price Changed</h2>
          <p><strong>Automation:</strong> ${automation.name}</p>
          <p><strong>Product URL:</strong> <a href="${url}">${url}</a></p>
          <p><strong>Current Price:</strong> ${rawPriceText} (parsed: ${currentPrice})</p>
          <p><strong>Previous Price:</strong> ${previousPrice}</p>
          <p><strong>Your Target Price:</strong> ${parsedTarget}</p>
          <p>Price has not yet reached your target.</p>
        `,
      });
    }

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
};
