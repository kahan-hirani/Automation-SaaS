import "dotenv/config";

import { sequelize } from "./src/models/index.model.js";

// Test database connection
sequelize
  .authenticate()
  .then(() => {
    console.log("✓ Database connected successfully");
  })
  .catch((err) => {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  });

import "./src/workers/automation.worker.js";

console.log("Worker started...");