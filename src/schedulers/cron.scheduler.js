import cron from "node-cron";
import * as cronParser from "cron-parser";
import Automation from "../models/automation.model.js";
import automationQueue from "../queues/automation.queue.js";

cron.schedule("* * * * *", async () => {

  const automations = await Automation.findAll({
    where: { isActive: true }
  });

  const now = new Date();

  for (const automation of automations) {

    try {

      const schedule = (automation.schedule || "").trim();
      if (!schedule) {
        console.error("Empty schedule for automation:", automation.id);
        continue;
      }

      const expr = cronParser.CronExpressionParser.parse(schedule);

      const next = expr.next();

      const diff = Math.abs(now.getTime() - next.getTime());

      // If schedule matches current minute (within 60 seconds)
      if (diff < 60000) {

        const jobId = `automation-${automation.id}`;

        // Skip adding if a job with this id already exists and is pending/active/delayed
        try {
          const existing = await automationQueue.getJob(jobId);
          if (existing) {
            const state = await existing.getState();
            if (["waiting", "active", "delayed", "paused"].includes(state)) {
              // already scheduled or running — skip
              continue;
            }
          }
        } catch (e) {
          console.error('Error checking existing job for', jobId, e);
        }

        await automationQueue.add(
          "runAutomation",
          { automationId: automation.id },
          {
            jobId,
            removeOnComplete: true,
            removeOnFail: true
          }
        );

      }

    } catch (error) {
      console.error("Invalid cron:", JSON.stringify(automation.schedule), error);
      console.error(error?.stack || error);
    }

  }

});