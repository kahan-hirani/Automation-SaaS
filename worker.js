import "dotenv/config";
import { sequelize } from "./src/models/index.model.js";
import logger from "./src/utils/logger.util.js";

async function startWorker() {
  // 1. Confirm DB is reachable before processing any jobs
  try {
    await sequelize.authenticate();
    logger.info("✓ Database connected successfully");
  } catch (err) {
    logger.error("✗ Database connection failed — worker cannot start", { error: err.message });
    process.exit(1);
  }

  // 2. Dynamically import the worker so it initialises AFTER DB is ready
  const { default: worker } = await import("./src/workers/automation.worker.js");

  logger.info("✓ BullMQ worker started and listening for jobs");

  // 3. Graceful shutdown on SIGTERM (Render sends this when stopping the service)
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received — closing worker gracefully...");
    await worker.close();
    await sequelize.close();
    process.exit(0);
  });
}

startWorker();
