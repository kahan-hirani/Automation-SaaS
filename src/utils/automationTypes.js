/**
 * Central registry of all supported automation types.
 * Adding a new type requires:
 *  1. Adding its key here.
 *  2. Creating a handler in src/handlers/<type>.handler.js
 *  3. Adding a case in automation.worker.js
 */

export const AUTOMATION_TYPES = {
  WEBSITE_UPTIME: "WEBSITE_UPTIME",
  PRICE_MONITOR:  "PRICE_MONITOR",
  JOB_MONITOR:    "JOB_MONITOR",
};

/** config fields required per type — used for validation */
export const REQUIRED_CONFIG_FIELDS = {
  [AUTOMATION_TYPES.WEBSITE_UPTIME]: ["url"],
  [AUTOMATION_TYPES.PRICE_MONITOR]:  ["url", "selector", "targetPrice"],
  [AUTOMATION_TYPES.JOB_MONITOR]:    ["url", "selector"],
};

/** Human-readable labels used in emails and logs */
export const AUTOMATION_TYPE_LABELS = {
  [AUTOMATION_TYPES.WEBSITE_UPTIME]: "Website Uptime Monitor",
  [AUTOMATION_TYPES.PRICE_MONITOR]:  "Price Monitor",
  [AUTOMATION_TYPES.JOB_MONITOR]:    "Job Listings Monitor",
};
