# UniConnect

UniConnect is a full-stack university collaboration platform.

Current status:
- Backend: complete
- Frontend: in progress

## Project Structure

- `server/` — Node.js + TypeScript + Prisma API
- `docs/` — requirements, proposal, and schema docs

## Quick Start (Current)

Since frontend is not completed yet, run backend only for now.

1. Go to backend:
	- `cd server`
2. Install dependencies:
	- `npm install`
3. Start database:
	- `docker compose up -d`
4. Apply dev DB migrations and seed:
	- `npx prisma migrate deploy`
	- `npm run db:seed`
5. Apply test DB migrations (required before first full test run):
	- `npm run db:migrate:test`
6. Start server:
	- `npm run dev`
7. Run tests:
	- `npm test`

For backend-specific notes, see `server/README.md`.