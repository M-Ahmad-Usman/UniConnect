# UniConnect Backend Setup

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## First-Time Setup

1. Install dependencies:
   - `npm install`
2. Start PostgreSQL:
   - `docker compose up -d`
3. Apply migrations (dev DB):
   - `npx prisma migrate deploy`
4. Seed dev DB:
   - `npm run db:seed`
5. Apply migrations (test DB):
   - `npm run db:migrate:test`

## Run

- Development server: `npm run dev`
- Build: `npm run build`

## Test

- Full suite: `npm test`

If full tests fail on a fresh machine with missing table errors, run:
- `npm run db:migrate:test`