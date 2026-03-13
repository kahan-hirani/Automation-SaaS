import express from "express";

import {
	registerUser,
	loginUser,
	logoutUser,
	getProfile,
	updateProfile,
	deleteAccount,
} from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/profile", isAuthenticated, getProfile);
router.put("/profile", isAuthenticated, updateProfile);
router.delete("/profile", isAuthenticated, deleteAccount);

export default router;