import sequelize from "../config/database.js";
import User from "./user.model.js";
import Automation from "./automation.model.js";

User.hasMany(Automation, { foreignKey: "userId" });
Automation.belongsTo(User, { foreignKey: "userId" });

export { sequelize, User, Automation };