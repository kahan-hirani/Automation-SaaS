import { Router } from "express";
import { createAutomation, getAutomation, updateAutomation, getAllAutomations, deleteAutomation } from "../controllers/automation.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";
import { automationCreationLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/create-automation", isAuthenticated, automationCreationLimiter, createAutomation);
router.get("/:id", isAuthenticated, getAutomation);
router.put("/:id", isAuthenticated, updateAutomation);
router.delete("/:id", isAuthenticated, deleteAutomation);
router.get("/", isAuthenticated, getAllAutomations);

export default router;