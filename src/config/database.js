import { Sequelize } from "sequelize";

const sequelize = new Sequelize("automation_saas", "postgres", "kahan@post123", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
  logging: false,
});

export default sequelize;