# UniConnect Frontend

React 19 + Vite frontend for UniConnect.

## Status
All planned frontend modules are implemented. Current cross-system release work
is tracked in `../docs/release_readiness.md` and `../docs/release_log.md`.

## Canonical Docs
- Frontend summary: `../docs/frontend.md`
- Detailed frontend architecture: `ARCHITECTURE.md`
- Frontend API integration contract: `API_CONTRACT.md`
- Backend-emitted API contract: `../server/docs/FRONTEND_BACKEND_CONTRACT.md`
- Security posture: `../docs/security.md`

## Quick Start
```bash
npm ci
npm run dev
```

The app runs at `http://localhost:5173` and proxies `/api` plus
`/api/socket.io` to the backend target.

## Scripts
```bash
npm run dev
npm run type-check
npm run lint
npm run test
npm run build
npm run test:e2e
```

## E2E (Playwright)
`npm run test:e2e` starts the backend and frontend dev servers automatically.

Environment overrides:
- `E2E_FRONTEND_HOST`, `E2E_FRONTEND_PORT`
- `E2E_BACKEND_HOST`, `E2E_BACKEND_PORT`
- `E2E_DATABASE_URL` (or `DATABASE_URL` from `server/.env.e2e`)

## Environment
Local development normally needs no frontend env file. Use `.env.example` only
when overriding the proxy target or enabling optional Sentry telemetry.

Production default remains same-origin deployment. Cross-origin deployment
requires the backend cookie/CORS/CSRF review documented in `../docs/security.md`.

## Maintenance
- Keep architecture and UI conventions in `ARCHITECTURE.md`.
- Keep frontend request/response integration notes in `API_CONTRACT.md`.
- Log future release work in `../docs/release_log.md`, not a frontend-local progress file.
