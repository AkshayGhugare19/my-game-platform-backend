/* Minimal structured logger (swap for pino/winston in prod without changing call sites). */
type Level = "info" | "warn" | "error" | "debug";

const log = (level: Level, msg: string, meta?: Record<string, unknown>) => {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta || {}),
  };
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](JSON.stringify(line));
};

export const logger = {
  info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
  debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
};
