import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false
  },

  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },

  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: ''
  },

  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },

  timezone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'UTC'
  },

  emailNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  plan: {
    type: DataTypes.ENUM('free', 'pro', 'enterprise'),
    defaultValue: 'free',
    allowNull: false
  }

}, {
  tableName: "users",
  timestamps: true
});

export default User;