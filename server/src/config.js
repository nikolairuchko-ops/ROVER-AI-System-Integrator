import "dotenv/config";

function numberFromEnv(name, fallback, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${name}: expected an integer from ${min} to ${max}`);
  }
  return value;
}

const origins = (process.env.FRONTEND_ORIGINS ?? "http://localhost:5500")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberFromEnv("PORT", 3000, 1, 65535),
  host: process.env.HOST ?? "0.0.0.0",
  frontendOrigins: origins,
  databaseUrl: process.env.DATABASE_URL ?? "",
  pgSsl: process.env.PGSSL === "true",
  rateLimitWindowMs: numberFromEnv("RATE_LIMIT_WINDOW_MS", 60_000, 1_000, 3_600_000),
  rateLimitMax: numberFromEnv("RATE_LIMIT_MAX", 120, 1, 10_000)
});