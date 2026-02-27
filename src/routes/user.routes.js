import express from "express";

import { registerUser, loginUser, logoutUser, getProfile } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/profile", isAuthenticated, getProfile);

export default router;