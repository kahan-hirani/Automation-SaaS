import { createAutomationService, getAutomationService, updateAutomationService, getAllAutomationsService, deleteAutomationService } from "../services/automation.service.js";
import asyncHandler from "../utils/asyncHandler.util.js";
import errorHandler from "../utils/errorHandler.util.js";

const createAutomation = asyncHandler(async (req, res, next) => {
  const automation = await createAutomationService(req.user.id, req.body);
  res.status(201).json({
    success: true,
    automation,
  });
});

const getAutomation = asyncHandler(async (req, res, next) => {
  const automation = await getAutomationService(req.user.id, req.params.id);
  if (!automation) throw new errorHandler("Automation not found", 404);
  res.status(200).json({
    success: true,
    automation,
  });
});

const updateAutomation = asyncHandler(async (req, res, next) => {
  const automation = await updateAutomationService(req.user.id, req.params.id, req.body);
  res.status(200).json({
    success: true,
    automation,
  });
});

const getAllAutomations = asyncHandler(async (req, res, next) => {
  const automations = await getAllAutomationsService(req.user.id);
  res.status(200).json({
    success: true,
    automations,
  });
});

const deleteAutomation = asyncHandler(async (req, res, next) => {
  await deleteAutomationService(req.user.id, req.params.id);
  res.status(200).json({
    success: true,
    message: "Automation deleted",
  });
});

const toggleAutomation = asyncHandler(async (req, res, next) => {
  const automation = await getAutomationService(req.user.id, req.params.id);
  if (!automation) throw new errorHandler("Automation not found", 404);
  
  automation.isActive = !automation.isActive;
  await automation.save();
  
  res.status(200).json({
    success: true,
    automation,
  });
});

export { createAutomation, getAutomation, updateAutomation, getAllAutomations, deleteAutomation, toggleAutomation };