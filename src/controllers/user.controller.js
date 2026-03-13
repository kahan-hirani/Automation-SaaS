import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from '../models/user.model.js';
import Automation from '../models/automation.model.js';
import AutomationLog from '../models/automationLog.model.js';
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
    expiresIn: "7d",
  });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      avatarUrl: newUser.avatarUrl,
      timezone: newUser.timezone,
      emailNotifications: newUser.emailNotifications,
      plan: newUser.plan,
      createdAt: newUser.createdAt,
    },
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
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailNotifications: user.emailNotifications,
      plan: user.plan,
      createdAt: user.createdAt,
    },
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
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });
  if (!user) {
    return next(new errorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

const updateProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return next(new errorHandler("User not found", 404));
  }

  const {
    email,
    firstName,
    lastName,
    avatarUrl,
    timezone,
    emailNotifications,
  } = req.body;

  if (typeof email === 'string' && email.trim() && email.trim() !== user.email) {
    const existing = await User.findOne({ where: { email: email.trim() } });
    if (existing && existing.id !== user.id) {
      return next(new errorHandler("Email already in use", 400));
    }
    user.email = email.trim();
  }

  if (typeof firstName === 'string') {
    user.firstName = firstName.trim();
  }

  if (typeof lastName === 'string') {
    user.lastName = lastName.trim();
  }

  if (typeof avatarUrl === 'string') {
    user.avatarUrl = avatarUrl;
  }

  if (typeof timezone === 'string' && timezone.trim()) {
    user.timezone = timezone.trim();
  }

  if (typeof emailNotifications === 'boolean') {
    user.emailNotifications = emailNotifications;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailNotifications: user.emailNotifications,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

const deleteAccount = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const automations = await Automation.findAll({
    where: { userId },
    attributes: ['id'],
  });

  const automationIds = automations.map((item) => item.id);
  if (automationIds.length > 0) {
    await AutomationLog.destroy({
      where: { automationId: automationIds },
    });
  }

  await Automation.destroy({ where: { userId } });
  await User.destroy({ where: { id: userId } });

  res.status(200).json({
    success: true,
    message: "Account and all related data deleted successfully",
  });
});

export { registerUser, loginUser, logoutUser, getProfile, updateProfile, deleteAccount };