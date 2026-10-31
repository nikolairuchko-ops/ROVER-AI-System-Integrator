import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { pool } from "./db.js";
import { asyncRoute, httpError, requireText } from "./http.js";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./security.js";

export const authRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "AUTH_RATE_LIMITED", message: "Too many authentication attempts. Try again later." } }
});
authRouter.use(authLimiter);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sessionDays = 30;

authRouter.post("/register", asyncRoute(async (req, res) => {
  if (!pool) throw httpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
  const email = requireText(req.body?.email, "Email", 254).toLowerCase();
  const displayName = requireText(req.body?.display_name, "Display name", 80);
  const password = req.body?.password;
  if (!emailPattern.test(email)) throw httpError(400, "INVALID_EMAIL", "Enter a valid email address.");
  if (typeof password !== "string" || password.length < 10 || password.length > 128) {
    throw httpError(400, "WEAK_PASSWORD", "Password must contain 10–128 characters.");
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const created = await client.query(
      "INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, created_at",
      [email, passwordHash, displayName]
    );
    const user = created.rows[0];
    const token = createSessionToken();
    await client.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))",
      [user.id, hashSessionToken(token), sessionDays]
    );
    await client.query(
      "INSERT INTO audit_events (actor_user_id, event_type, resource_type, resource_id) VALUES ($1, 'auth.register', 'user', $1)",
      [user.id]
    );
    await client.query("COMMIT");
    res.status(201).json({ user, token, expires_in: sessionDays * 86400 });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") throw httpError(409, "EMAIL_IN_USE", "An account with this email already exists.");
    throw error;
  } finally {
    client.release();
  }
}));

authRouter.post("/login", asyncRoute(async (req, res) => {
  if (!pool) throw httpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
  const email = requireText(req.body?.email, "Email", 254).toLowerCase();
  const password = req.body?.password;
  if (typeof password !== "string" || password.length > 128) {
    throw httpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  const found = await pool.query(
    "SELECT id, email, display_name, password_hash, status FROM users WHERE email = $1",
    [email]
  );
  const userRow = found.rows[0];
  const valid = userRow ? await verifyPassword(password, userRow.password_hash) : false;
  if (!valid || userRow.status !== "active") {
    throw httpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  const token = createSessionToken();
  await pool.query(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))",
    [userRow.id, hashSessionToken(token), sessionDays]
  );
  await pool.query(
    "INSERT INTO audit_events (actor_user_id, event_type, resource_type, resource_id) VALUES ($1, 'auth.login', 'user', $1)",
    [userRow.id]
  );
  res.json({
    user: { id: userRow.id, email: userRow.email, display_name: userRow.display_name },
    token,
    expires_in: sessionDays * 86400
  });
}));

authRouter.post("/logout", authenticate, asyncRoute(async (req, res) => {
  const token = req.authToken;
  if (token && pool) {
    await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  }
  res.status(204).end();
}));

export async function authenticate(req, _res, next) {
  try {
    const header = req.get("authorization") || "";
    const match = header.match(/^Bearer ([A-Za-z0-9_-]{40,100})$/);
    if (!match) throw httpError(401, "UNAUTHENTICATED", "Sign in to continue.");
    if (!pool) throw httpError(503, "DATABASE_UNAVAILABLE", "Database is not configured.");
    const token = match[1];
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = 'active'`,
      [hashSessionToken(token)]
    );
    if (!result.rows[0]) throw httpError(401, "SESSION_EXPIRED", "Session is invalid or expired.");
    req.user = result.rows[0];
    req.authToken = token;
    next();
  } catch (error) {
    next(error);
  }
}
