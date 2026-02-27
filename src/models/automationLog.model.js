import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AutomationLog = sequelize.define("AutomationLog", {

	id: {
		type: DataTypes.UUID,
		defaultValue: DataTypes.UUIDV4,
		primaryKey: true
	},

	automationId: {
		type: DataTypes.UUID,
		allowNull: false,
		references: {
			model: "automations",
			key: "id"
		}
	},

	status: {
		type: DataTypes.STRING,
		allowNull: false
	},

	result: {
		type: DataTypes.JSON,
		allowNull: true
	},

	error: {
		type: DataTypes.TEXT,
		allowNull: true
	}

}, {
	tableName: "automation_logs",
	timestamps: true
});

export default AutomationLog;

