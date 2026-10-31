import { Router } from "express";
import { pool } from "./db.js";
import { authenticate } from "./auth.js";
import { asyncRoute, httpError, requireText } from "./http.js";

export const projectsRouter = Router();

projectsRouter.get("/", authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, description, configuration, created_at, updated_at FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC",
    [req.user.id]
  );
  res.json({ projects: result.rows });
}));

projectsRouter.post("/", authenticate, asyncRoute(async (req, res) => {
  const name = requireText(req.body?.name, "Project name", 120);
  const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 2000) : "";
  const configuration = req.body?.configuration ?? {};
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw httpError(400, "INVALID_CONFIGURATION", "Configuration must be a JSON object.");
  }
  const result = await pool.query(
    "INSERT INTO projects (owner_id, name, description, configuration) VALUES ($1, $2, $3, $4::jsonb) RETURNING id, name, description, configuration, created_at, updated_at",
    [req.user.id, name, description, JSON.stringify(configuration)]
  );
  res.status(201).json({ project: result.rows[0] });
}));

projectsRouter.get("/:projectId", authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    "SELECT id, name, description, configuration, created_at, updated_at FROM projects WHERE id = $1 AND owner_id = $2",
    [req.params.projectId, req.user.id]
  );
  if (!result.rows[0]) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found.");
  res.json({ project: result.rows[0] });
}));

projectsRouter.patch("/:projectId", authenticate, asyncRoute(async (req, res) => {
  const current = await pool.query("SELECT id, name, description, configuration FROM projects WHERE id = $1 AND owner_id = $2", [req.params.projectId, req.user.id]);
  if (!current.rows[0]) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found.");
  const name = req.body?.name === undefined ? current.rows[0].name : requireText(req.body.name, "Project name", 120);
  const description = req.body?.description === undefined ? current.rows[0].description : (typeof req.body.description === "string" ? req.body.description.trim().slice(0, 2000) : null);
  const configuration = req.body?.configuration === undefined ? current.rows[0].configuration : req.body.configuration;
  if (description === null || !configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw httpError(400, "INVALID_INPUT", "Description or configuration is invalid.");
  }
  const result = await pool.query(
    "UPDATE projects SET name = $1, description = $2, configuration = $3::jsonb, updated_at = NOW() WHERE id = $4 AND owner_id = $5 RETURNING id, name, description, configuration, created_at, updated_at",
    [name, description, JSON.stringify(configuration), req.params.projectId, req.user.id]
  );
  res.json({ project: result.rows[0] });
}));

projectsRouter.delete("/:projectId", authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query("DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id", [req.params.projectId, req.user.id]);
  if (!result.rows[0]) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found.");
  res.status(204).end();
}));
