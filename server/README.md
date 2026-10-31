# ROVER AI API — Stage 1

Node.js API foundation for the ROVER AI System Integrator.

## Included

- Express API server with security headers and JSON size limits
- CORS allowlist configured by environment variable
- Global request rate limiting
- Liveness and readiness endpoints
- PostgreSQL connection pool and connectivity probe
- Initial SQL schema for users, projects, conversations, messages, and audit events
- Graceful shutdown for Railway deployments

This stage deliberately does **not** implement login, password reset, AI provider calls, file uploads, or physical-device commands. Those require separate implementation and security review.

## Local run

Requirements: Node.js 22+ and npm.

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

API endpoints:

- `GET /` — service metadata
- `GET /health/live` — process liveness
- `GET /health/ready` — readiness and PostgreSQL connectivity
- `GET /api/v1/system/info` — API capabilities

## Environment variables

- `PORT` — provided automatically by Railway
- `HOST` — bind address; use `0.0.0.0`
- `NODE_ENV` — `production` in Railway
- `FRONTEND_ORIGINS` — comma-separated exact allowed origins
- `DATABASE_URL` — Railway PostgreSQL connection URL
- `PGSSL` — set to `true` only if the selected PostgreSQL endpoint requires TLS
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` — request throttling

Never commit `.env` or provider secrets.

## Railway deployment

Create a Node.js service from this repository and set its **Root Directory** to `/server`. Railway should detect npm and use:

- Build: `npm install`
- Start: `npm start`

Provision PostgreSQL in the same Railway project and attach its `DATABASE_URL` reference to the API service. Set `FRONTEND_ORIGINS` to the deployed frontend origin(s). Configure a health check path of `/health/ready`.

Before enabling production traffic, apply `migrations/001_initial_schema.sql` to the PostgreSQL database using a controlled migration process. The server intentionally does not modify database schema at startup.

## Current stage boundary

This is the backend foundation only. Authentication, authorization, AI orchestration, project CRUD, observability, and Device Gateway are subsequent stages. The Device Gateway must enforce authentication, command validation, hardware-specific safety limits, and an independent emergency-stop path.