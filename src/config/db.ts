import { Sequelize } from "sequelize";
import env from "./env";

// Sequelize instance — PostgreSQL, snake_case, pooled.
const dialectOptions: Record<string, unknown> = {
  options: "-c search_path=public",
};

if (env.db.ssl) {
  dialectOptions.ssl = { require: true, rejectUnauthorized: false };
}

const sequelize = new Sequelize({
  dialect: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  logging: env.nodeEnv === "development" ? false : false,
  dialectOptions,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  define: {
    underscored: true,
    timestamps: true,
    freezeTableName: false,
  },
});

export default sequelize;
