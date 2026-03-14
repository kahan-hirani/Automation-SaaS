import { Sequelize } from "sequelize";

const commonOptions = {
  dialect: "postgres",
  logging: false,
};

const sslEnabled = process.env.DB_SSL === "true" || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("supabase.com"));

const dialectOptions = sslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : undefined;

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    ...commonOptions,
    dialectOptions,
  })
  : new Sequelize(
    process.env.DB_NAME || "automation_saas",
    process.env.DB_USER || "postgres",
    process.env.DB_PASSWORD || "postgres",
    {
      ...commonOptions,
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      dialectOptions,
    }
  );

export default sequelize;