# UniConnect

UniConnect is a Discord-like university communication platform for National
Textile University. It organizes official communication into department, class,
and society servers with scoped role-based access control.

## Status
- Backend: complete and hardened.
- Frontend: complete and hardened.
- Full-system hardening Modules 1-7: complete.
- Current follow-ups are tracked through the release readiness and release log
  docs.

## Repository Layout
```text
UniConnect-development/
├── client/   # React 19 + Vite frontend
├── server/   # Express 5 + Prisma backend
├── docs/     # Project-level docs, release readiness, security, requirements
└── AGENTS.md # Coding-agent operating instructions
```

This is not a root workspace. Run app commands inside the relevant directory.

## First Docs To Read
- Project documentation index: `docs/README.md`
- Release readiness checklist: `docs/release_readiness.md`
- Active release log: `docs/release_log.md`
- Security posture: `docs/security.md`
- Backend summary: `docs/backend.md`
- Frontend summary: `docs/frontend.md`

## Backend Quick Start
```bash
cd server
npm ci
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:migrate` applies committed migrations non-interactively. Create a
new migration only after intentional Prisma schema edits:
```bash
npm run db:migrate:dev -- --name short_descriptive_name
```

Useful backend checks:
```bash
cd server
timeout 120 npm run build
timeout 120 npm test
```

## Frontend Quick Start
```bash
cd client
npm ci
npm run dev
```

Useful frontend checks:
```bash
cd client
timeout 120 npm run type-check
timeout 120 npm run lint
timeout 120 npm run test
timeout 120 npm run build
```

## Runtime Model
- Local frontend uses the Vite proxy for `/api` and `/api/socket.io`.
- Production default is same-origin frontend/backend deployment.
- Auth is cookie-based with CSRF protection for unsafe methods.
- Optional Sentry telemetry is disabled unless DSN environment variables are set.

## Documentation Rule
Root `docs/` owns cross-system navigation, security posture, and release state.
Backend-local and frontend-local docs remain authoritative for subsystem-specific
implementation contracts.
