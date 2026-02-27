import express from "express";
import userRoute from "../routes/user.routes.js";
import automationRoute from "../routes/automation.routes.js";

const router = express.Router();

router.use("/auth/users", userRoute);
router.use("/automations", automationRoute);

export default router;