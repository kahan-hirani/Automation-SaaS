import sequelize from "../config/database.js";
import User from "./user.model.js";
import Automation from "./automation.model.js";
import AutomationLog from "./automationLog.model.js";

// User <-> Automation relationship
User.hasMany(Automation, { foreignKey: "userId" });
Automation.belongsTo(User, { foreignKey: "userId" });

// Automation <-> AutomationLog relationship
Automation.hasMany(AutomationLog, { foreignKey: "automationId" });
AutomationLog.belongsTo(Automation, { foreignKey: "automationId" });

export { sequelize, User, Automation, AutomationLog };