import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import { AUTOMATION_TYPES } from "../utils/automationTypes.js";

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

  /**
   * Legacy field — kept for WEBSITE_UPTIME automations created before
   * the multi-type upgrade.  New automations store the URL inside `config.url`.
   */
  targetUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  schedule: {
    type: DataTypes.STRING,
    allowNull: false
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },

  /** Which automation engine to run (WEBSITE_UPTIME | PRICE_MONITOR | JOB_MONITOR) */
  automationType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: AUTOMATION_TYPES.WEBSITE_UPTIME
  },

  /**
   * Type-specific configuration.
   * WEBSITE_UPTIME → { url }
   * PRICE_MONITOR  → { url, selector, targetPrice }
   * JOB_MONITOR    → { url, selector }
   */
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },

  /**
   * Persisted state across runs, e.g. lastJobCount for JOB_MONITOR
   * or previousPrice for PRICE_MONITOR.
   */
  automationState: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }

}, {
  tableName: "automations",
  timestamps: true
});

export default Automation;