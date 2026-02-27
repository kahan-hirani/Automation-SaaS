import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Automation = sequelize.define("Automation", {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  targetUrl: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  schedule: {
    type: DataTypes.STRING,
    allowNull: false
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }

}, {
  tableName: "automations",
  timestamps: true
});

export default Automation;