// sequelize-cli config (env-driven).
require("dotenv").config();

const isLocal = ["localhost", "127.0.0.1", "", undefined].includes(
  process.env.DB_HOST
);
const useSSL =
  process.env.DB_SSL !== undefined && process.env.DB_SSL !== ""
    ? String(process.env.DB_SSL).toLowerCase() === "true"
    : !isLocal;

const base = {
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "gamify_engage",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  dialectOptions: {
    options: "-c search_path=public",
    ...(useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
  },
};

module.exports = { development: base, test: base, production: base };
