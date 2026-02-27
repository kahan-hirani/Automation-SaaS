import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from '../models/user.model.js';
import asyncHandler from "../utils/asyncHandler.util.js";
import errorHandler from "../utils/errorHandler.util.js";

const registerUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new errorHandler("User already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    email,
    password: hashedPassword,
  });

  const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(201).json({
    success: true,
    token,
  });
});

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new errorHandler("Invalid credentials", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new errorHandler("Invalid credentials", 401));
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.status(200).json({
    success: true,
    token,
  });
});

const logoutUser = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return next(new errorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

export { registerUser, loginUser, logoutUser, getProfile };