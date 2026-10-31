import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import { checkDatabase } from "./db.js";
import { authRouter, authenticate } from "./auth.js";
import { projectsRouter } from "./projects.js";
import { conversationsRouter } from "./conversations.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use(express.json({ limit: "256kb" }));
app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } }
}));

app.get("/", (_req, res) => {
  res.json({
    name: "ROVER AI API",
    version: "0.2.0",
    docs: "https://github.com/nikolairuchko-ops/ROVER-AI-System-Integrator/tree/main/server"
  });
});

app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok", service: "rover-ai-api" });
});

app.get("/health/ready", async (_req, res, next) => {
  try {
    const database = await checkDatabase();
    const ready = database.configured && database.connected;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", service: "rover-ai-api", database });
  } catch (error) { next(error); }
});

app.get("/api/v1/system/info", (_req, res) => {
  res.json({
    product: "ROVER AI",
    component: "API Gateway",
    apiVersion: "v1",
    environment: config.nodeEnv,
    capabilities: {
      authentication: "active",
      projects: "active",
      conversationHistory: "active",
      aiOrchestration: "not_connected",
      deviceGateway: "not_connected"
    }
  });
});

app.use("/api/v1/auth", authRouter);
app.get("/api/v1/auth/me", authenticate, (req, res) => res.json({ user: req.user }));
app.use("/api/v1/projects", authenticate, projectsRouter);
app.use("/api/v1", authenticate, conversationsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
});

app.use((error, _req, res, _next) => {
  if (error.message === "Origin is not allowed by CORS") {
    return res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not allowed." } });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error("[ROVER API]", error);
  return res.status(status).json({
    error: {
      code: status >= 500 ? "INTERNAL_ERROR" : (error.code || "REQUEST_ERROR"),
      message: status >= 500 ? "An internal server error occurred." : error.message
    }
  });
});
