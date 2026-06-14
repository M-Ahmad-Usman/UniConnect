# UniConnect Backend

## Purpose
This service provides the UniConnect backend API, authentication, authorization, notifications, and realtime delivery.

## Core Docs
- Project documentation index: `../docs/README.md`
- Backend documentation index: `docs/README.md`
- Backend summary: `../docs/backend.md`
- Security posture: `../docs/security.md`
- Release log: `../docs/release_log.md`
- Architecture and coding standards: `BACKEND_ARCHITECTURE.md`
- Frontend integration contract: `docs/FRONTEND_BACKEND_CONTRACT.md`
- API error code catalog: `docs/API_ERROR_CODES.md`
- Dependency version audit: `../docs/dependency_version_audit.md`

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
3. Apply existing dev migrations.
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
2. If new migration files were pulled, run:
```bash
npm run db:migrate
npm run db:migrate:test
```
3. If you intentionally changed `prisma/schema.prisma`, create a named dev
   migration and review the generated SQL before committing it:
```bash
npm run db:migrate:dev -- --name short_descriptive_name
npm run db:migrate:test
```
4. Start dev server:
```bash
npm run dev
```

## Scripts
- `npm run dev`: start backend in watch mode
- `npm run build`: compile TypeScript
- `npm run start`: run compiled app from `dist/`
- `npm test`: run full Jest suite against test DB
- `npm run test:coverage`: run coverage suite
- `npm run db:migrate`: apply existing migrations to the dev DB without prompting
- `npm run db:migrate:dev -- --name <name>`: create/apply a new dev migration after schema changes
- `npm run db:migrate:test`: apply migrations to test DB
- `npm run db:status`: show Prisma migration status for the dev DB
- `npm run db:seed`: seed dev DB
- `npm run db:reset`: reset dev DB
- `npm run db:studio`: open Prisma Studio

## Migration Command Guidance
Use `npm run db:migrate` for fresh setup, pulls, and presentation/demo refreshes.
It runs `prisma migrate deploy`, which applies committed migration files and is
non-interactive.

Use `npm run db:migrate:dev -- --name <name>` only when you have intentionally
changed `prisma/schema.prisma` and want Prisma to generate a new migration.
`migrate dev` uses a shadow database, checks drift, and may prompt for a new
migration name when the Prisma schema has differences not represented by the
committed migration history. This project also has SQL-only constraints and
extensions in migrations, so generated migrations must be reviewed before use.

## Demo Seed Data
`npm run db:seed` creates an idempotent presentation dataset:
- Computer Science department with HOD, Program Directors, lecturers, students,
  CRs, society leaders, and moderators.
- BSCS and BSSE demo programs with complete all-semester curricula across
  multiple batches.
- Three active classes whose current-semester course channels and teacher
  assignments match their curricula.
- Department, program, class, course, and society channels with sample posts.
- IEEE Student Society with active members and pending/approved membership
  request examples.

Useful demo logins are printed after seeding. Most use `Demo@1234`; the admin
seed uses `TEMP_Admin@123` and intentionally requires a password change.

## Testing
Run all tests:
```bash
npm test
```

Common prep for a fresh machine:
```bash
npm run db:migrate:test
```

## E2E (Playwright)
- `npm run dev:e2e` runs the backend with `.env.e2e`.
- Keep `.env.e2e` pointing at the shared `uniconnect_test` database.
- If Playwright runs on non-default ports, override `PORT`, `CORS_ORIGIN`, and `CSRF_TRUSTED_ORIGINS`.

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
- Keep this README operational; keep architecture, security, and release
  decisions in the linked docs.
