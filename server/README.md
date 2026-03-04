# UniConnect Backend

## Purpose
This service provides the UniConnect backend API, authentication, authorization, notifications, and realtime delivery.

## Core Docs
- Documentation index: `docs/README.md`
- Architecture and coding standards: `API_DEVELOPMENT_PLAN.md`
- Delivery and module status: `PROGRESS.md`
- Hardening roadmap and status: `HARDENING_PLAN.md`
- Hardening implementation history: `HARDENING_LOG.md`
- Frontend integration contract: `docs/FRONTEND_BACKEND_CONTRACT.md`
- API error code catalog: `docs/API_ERROR_CODES.md`

## Prerequisites
- Node.js 20+
- Docker and Docker Compose

## Environment Setup
1. Copy `.env.example` values into your local `.env`.
2. Ensure `.env.test` exists for test commands.
3. Confirm `DATABASE_URL` points to the dev database.

## First-Time Local Setup
1. Install dependencies.
```bash
npm install
```
2. Start PostgreSQL.
```bash
docker compose up -d
```
3. Apply dev migrations.
```bash
npm run db:migrate
```
4. Seed dev database.
```bash
npm run db:seed
```
5. Apply test migrations.
```bash
npm run db:migrate:test
```

## Daily Development Workflow
1. Pull latest changes.
2. If Prisma schema changed, run:
```bash
npm run db:migrate
npm run db:migrate:test
```
3. Start dev server:
```bash
npm run dev
```

## Scripts
- `npm run dev`: start backend in watch mode
- `npm run build`: compile TypeScript
- `npm run start`: run compiled app from `dist/`
- `npm test`: run full Jest suite against test DB
- `npm run test:coverage`: run coverage suite
- `npm run db:migrate`: create/apply Prisma migration in dev
- `npm run db:migrate:test`: apply migrations to test DB
- `npm run db:seed`: seed dev DB
- `npm run db:reset`: reset dev DB
- `npm run db:studio`: open Prisma Studio

## Testing
Run all tests:
```bash
npm test
```

Common prep for a fresh machine:
```bash
npm run db:migrate:test
```

## Troubleshooting

### Missing table or migration errors in tests
Run:
```bash
npm run db:migrate:test
```

### Port/database connectivity issues
- Verify DB container is up: `docker compose ps`
- Verify connection settings in `.env` and `.env.test`

### Prisma client/schema mismatch
Run:
```bash
npx prisma generate
```

## Notes
- Health endpoint: `GET /api/health`
- Realtime uses Socket.IO with cookie-based auth.
- Keep this README operational; keep architecture and governance decisions in the linked docs.