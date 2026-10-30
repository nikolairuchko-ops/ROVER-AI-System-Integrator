# ROVER AI — System Integrator

Single-page web prototype for the ROVER AI platform.

## Run locally
Open `index.html` in a modern browser. No build step or package installation is required.

## Included
- System overview and target architecture
- Integration module registry and five-stage roadmap
- Local demonstration chat UI (no external model connected)
- Local file selection and metadata listing
- Robot command simulator (does not control physical hardware)
- Browser-local settings and architecture JSON export

## Current limitations
This repository contains the frontend prototype only. It does not include a backend, database, user authentication, external AI provider credentials, cloud file storage, or physical robot integration. Never place provider API keys in browser code. Robot control requires a separately implemented authenticated gateway, safety validation, and hardware emergency stop.

## Planned architecture
Web Client → API / Auth → AI Orchestrator → Data Layer, with a separate Device Gateway for telemetry and explicitly authorized device commands.

## License
No license has been granted yet.