import dotenv from "dotenv";
dotenv.config();

/**
 * Typed, validated environment. Fails fast at boot (see SECURITY.md) so the
 * process never starts with an insecure / incomplete configuration.
 */
const required = (key: string): string => {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
};

const isProd = process.env.NODE_ENV === "production";

const env = {
  isProd,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5001,
  // Explicit allow-list from CORS_ORIGINS (comma-separated). If unset, the
  // app reflects any request origin (see app.ts) so deploys work without
  // extra config; set CORS_ORIGINS to lock this down.
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "root",
    name: process.env.DB_NAME || "gamify_engage",
    ssl: String(process.env.DB_SSL || "").toLowerCase() === "true",
  },

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  },

  passwordSecret:
    process.env.PASSWORD_SECRET || "gamify-engage-shared-password-secret",

  hamaraEngage: {
    // Base URL of the Hamara Engage backend REST API.
    baseUrl: (
      process.env.HAMARA_ENGAGE_BACKEND || "http://localhost:5000/api"
    ).replace(/\/+$/, ""),
    timeoutMs: Number(process.env.HAMARA_ENGAGE_TIMEOUT_MS) || 8000,
    // Shared secret for service-to-service calls (must match hamara's
    // SERVICE_SHARED_KEY). Sent as the `x-service-key` header.
    serviceKey:
      process.env.SERVICE_SHARED_KEY || "hamara-gamify-shared-service-key",
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || "Gamify Engage <no-reply@gamify.local>",
  },
};

// Production hardening guards (fail fast > insecure default).
if (isProd) {
  if (env.jwt.accessSecret.length < 32 || env.jwt.refreshSecret.length < 32) {
    // eslint-disable-next-line no-console
    console.error("❌ JWT secrets must be >= 32 chars in production");
    process.exit(1);
  }
  if (env.corsOrigins.includes("*")) {
    // eslint-disable-next-line no-console
    console.error("❌ CORS_ORIGINS must not be '*' in production");
    process.exit(1);
  }
}

export default env;
