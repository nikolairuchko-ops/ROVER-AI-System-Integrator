import { Router } from "express";
import { pool } from "./db.js";
import { asyncRoute, httpError, requireText } from "./http.js";

export const conversationsRouter = Router();

conversationsRouter.get("/projects/:projectId/conversations", asyncRoute(async (req, res) => {
  const owned = await pool.query("SELECT id FROM projects WHERE id = $1 AND owner_id = $2", [req.params.projectId, req.user.id]);
  if (!owned.rows[0]) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found.");
  const result = await pool.query(
    "SELECT id, project_id, title, created_at, updated_at FROM conversations WHERE project_id = $1 AND user_id = $2 ORDER BY updated_at DESC",
    [req.params.projectId, req.user.id]
  );
  res.json({ conversations: result.rows });
}));

conversationsRouter.post("/projects/:projectId/conversations", asyncRoute(async (req, res) => {
  const owned = await pool.query("SELECT id FROM projects WHERE id = $1 AND owner_id = $2", [req.params.projectId, req.user.id]);
  if (!owned.rows[0]) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found.");
  const title = req.body?.title === undefined ? "New conversation" : requireText(req.body.title, "Conversation title", 160);
  const result = await pool.query(
    "INSERT INTO conversations (user_id, project_id, title) VALUES ($1, $2, $3) RETURNING id, project_id, title, created_at, updated_at",
    [req.user.id, req.params.projectId, title]
  );
  res.status(201).json({ conversation: result.rows[0] });
}));

conversationsRouter.get("/conversations/:conversationId/messages", asyncRoute(async (req, res) => {
  const owned = await pool.query(
    "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
    [req.params.conversationId, req.user.id]
  );
  if (!owned.rows[0]) throw httpError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
  const result = await pool.query(
    "SELECT id, role, content, metadata, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 1000",
    [req.params.conversationId]
  );
  res.json({ messages: result.rows });
}));

conversationsRouter.post("/conversations/:conversationId/messages", asyncRoute(async (req, res) => {
  const role = req.body?.role;
  if (!["user", "assistant"].includes(role)) throw httpError(400, "INVALID_ROLE", "Message role must be user or assistant.");
  const content = requireText(req.body?.content, "Message content", 100_000);
  const metadata = req.body?.metadata ?? {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw httpError(400, "INVALID_METADATA", "Message metadata must be a JSON object.");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const owned = await client.query(
      "SELECT id FROM conversations WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [req.params.conversationId, req.user.id]
    );
    if (!owned.rows[0]) throw httpError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    const inserted = await client.query(
      "INSERT INTO messages (conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4::jsonb) RETURNING id, role, content, metadata, created_at",
      [req.params.conversationId, role, content, JSON.stringify(metadata)]
    );
    await client.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [req.params.conversationId]);
    await client.query("COMMIT");
    res.status(201).json({ message: inserted.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));
