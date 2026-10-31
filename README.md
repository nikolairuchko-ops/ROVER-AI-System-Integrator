# ROVER AI — System Integrator

ROVER AI is a modular system-integrator prototype with a static web client and a staged Node.js / Express API foundation.

## Frontend
Open `index.html` in a modern browser or publish the repository through GitHub Pages. No frontend build step is required.

The Settings view can check these live API endpoints when a backend URL is configured:
- `GET /health/live`
- `GET /health/ready` (includes PostgreSQL readiness)
- `GET /api/v1/system/info`

The client stores the API URL and project name in browser localStorage. It does not store credentials.

## Backend
The API is in `server/`. See [server/README.md](server/README.md) for local setup, environment variables, migrations, and tests.

For GitHub Pages, set `FRONTEND_ORIGINS` on the server to include:
`https://nikolairuchko-ops.github.io`

For local development, include the exact origin used by your local web server (for example `http://localhost:5500`). CORS compares origins, not page paths.

## Current implementation boundaries
- API liveness, readiness, system metadata, security headers, rate limiting, and PostgreSQL connectivity foundation are implemented.
- Authentication, user/project CRUD, persisted conversations, AI provider routing, cloud file storage, and real device control are not implemented yet.
- The chat and robot panels remain local demonstrations; the robot simulator never sends commands to physical hardware.
- Provider API keys must remain server-side. Device commands require authorization, validation, audit logging, and a hardware emergency stop before any real integration.

## Deployment
The backend can be deployed from the `server/` directory. Configure `DATABASE_URL` using a Railway PostgreSQL reference and set `FRONTEND_ORIGINS` before exposing the API publicly. Do not commit secrets to Git.

## License
No license has been granted yet.
