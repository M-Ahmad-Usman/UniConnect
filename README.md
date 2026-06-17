# UniConnect

UniConnect is a Discord-like university communication platform for National
Textile University. It organizes official communication into department, class,
and society servers with scoped role-based access control.

## Status
- Backend: complete and hardened.
- Frontend: complete and hardened.
- Full-system hardening Modules 1-7: complete.
- Production deployment: live on Azure App Service via Docker container.
- Current follow-ups are tracked through the release readiness and release log
  docs.

## Repository Layout
```text
UniConnect/
├── client/          # React 19 + Vite frontend
├── server/          # Express 5 + Prisma backend
├── docs/            # Project-level docs, release readiness, security, requirements
├── Dockerfile       # Multi-stage production image (client build + server build)
├── .dockerignore    # Docker build context exclusions
├── .github/
│   └── workflows/
│       └── deploy-azure.yml  # CI/CD: test → build → push → deploy
└── AGENTS.md        # Coding-agent operating instructions
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
npm run build
npm test
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
npm run type-check
npm run lint
npm run test
npm run build
```

## Runtime Model
- Local frontend uses the Vite proxy for `/api` and `/api/socket.io`.
- Production default is same-origin frontend/backend deployment.
- Auth is cookie-based with CSRF protection for unsafe methods.
- Optional Sentry telemetry is disabled unless DSN environment variables are set.

## Production Deployment
UniConnect is deployed as a Docker container on Azure App Service. Every push
to `main` triggers a four-job pipeline:

```
push to main
  ├── integration-tests   Jest + PostgreSQL service container
  │     └── gates → docker-build-push
  ├── e2e-tests           Playwright in official MS container (informational, parallel)
  ├── docker-build-push   Multi-stage image → ghcr.io
  └── deploy              prisma migrate deploy → update App Service → health check
```

Key deployment facts:
- Container registry: GitHub Container Registry (`ghcr.io`)
- Hosting: Azure App Service for Linux, B1 Basic plan
- Node runtime: 24 (inside the Docker image)
- Database: Azure Database for PostgreSQL Flexible Server, PostgreSQL 18
- Live URL: `https://uni-connect.dev`
- E2E tests run in parallel and do not block the deploy on `main`. They gate
  pull requests via the `pull_request` trigger.

See `docs/deployment.md` for the full deployment guide and
`docs/azure_concepts.md` for concepts and troubleshooting.

## Mobile App (Android)
UniConnect has an Android wrapper built with Capacitor. It loads the live hosted
app at `https://uni-connect.dev` inside a WebView.

- Wrapper project: `mobile/`
- Setup and build guide: `mobile/README.md`
- App ID: `dev.uniconnect.app`
- Min Android SDK: 26 (Android 8.0)
- Deep links from `https://uni-connect.dev` open the app after Android verifies
  `/.well-known/assetlinks.json`.
- FCM push notifications are planned for a future phase.

## Documentation Rule
Root `docs/` owns cross-system navigation, security posture, and release state.
Backend-local and frontend-local docs remain authoritative for subsystem-specific
implementation contracts.
