import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.pgSsl ? { rejectUnauthorized: true } : undefined,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    })
  : null;

export async function checkDatabase() {
  if (!pool) {
    return { configured: false, connected: false };
  }

  await pool.query("SELECT 1");
  return { configured: true, connected: true };
}

export async function closeDatabase() {
  if (pool) await pool.end();
}