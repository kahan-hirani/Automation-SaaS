import express from "express";
import userRoute from "../routes/user.routes.js";
import automationRoute from "../routes/automation.routes.js";
import logRoute from "../routes/log.routes.js";
import metricsRoute from "../routes/metrics.routes.js";

const router = express.Router();

router.use("/auth/users", userRoute);
router.use("/automations", automationRoute);
router.use("/logs", logRoute);
router.use("/metrics", metricsRoute);

export default router;