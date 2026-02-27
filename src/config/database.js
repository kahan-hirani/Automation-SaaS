import { Sequelize } from "sequelize";


const sequelize = new Sequelize("automateDB", "postgres", "kahan@post123", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
});

export default sequelize;