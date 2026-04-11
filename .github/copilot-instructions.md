# UniConnect - Copilot Instructions

UniConnect is a Discord-like platform for official university announcements organized into servers and channels. It's designed for National Textile University.

## Build & Run Commands

```bash
# Database (PostgreSQL via Docker)
cd server
docker compose up -d             # Start PostgreSQL container
docker compose down              # Stop container

# Database Migrations
npm run migrate:latest           # Run all pending migrations
npm run migrate:up               # Run next migration
npm run migrate:down             # Rollback last migration
npm run create:migration         # Create new migration file
npm run get:migrations           # List migration status

# Development
npm run dev                      # Start dev server (port from .env)
npm run start                    # Start production server from compiled js
npm run build                    # Compile TypeScript

# Linting
npm run lint
```

**No test suite exists yet.** Testing infrastructure is not set up yet.

## Architecture Overview

### Stack
- **Backend:** Node.js + Express + TypeScript (ES modules, `module: "nodenext"`)
- **Database:** PostgreSQL 18.3 with Kysely query builder
- **ORM:** Kysely with CamelCasePlugin (camelCase in code → snake_case in DB)
- **Validation:** Zod for environment variables and input validation

### Project Structure

```
server/
├── src/
│   ├── index.ts              # Entry point, server setup, graceful shutdown
│   ├── app.ts                # Express app configuration
│   ├── config/
│   │   └── env.ts            # Zod-validated environment variables
│   └── db/
│       ├── index.ts          # Kysely instance with CamelCasePlugin
│       ├── types.ts          # TypeScript database types (Database interface)
│       ├── migrator.ts       # Custom migration CLI tool
│       ├── helpers.ts        # Database utility functions
│       └── migrations/       # Timestamped migration files
├── docker-compose.yml        # PostgreSQL container (port 5433)
├── .env.example              # Environment variable template
├── tsconfig.json             # Strict TypeScript config
└── eslint.config.mjs         # ESLint with typescript-eslint + stylistic rules

docs/
├── schema.md                 # ERD in eraser.io syntax (source of truth for schema)
├── functional_requirements.md  # Detailed FR specs with role permissions
├── entity_deletion_rules.md    # Soft/hard delete rules per entity
└── proposal.md               # Project proposal
```

### Database Layer

**Key Conventions:**
- **Naming:** camelCase in TypeScript (`types.ts`), snake_case in database (handled by CamelCasePlugin)
- **Migrations:** Manual snake_case required (plugin doesn't work in migrations)
- **Type Generation:** Manual TypeScript types in `types.ts` (no codegen tool)
- **Primary Keys:** `id` columns, auto-incrementing via `GENERATED ALWAYS AS IDENTITY`
- **Public IDs:** UUIDv7 in `public_id` columns for external references

**Migration Files:**
- Named: `YYYY-MM-DDTHH-MM-SS.sssZ_description.ts`
- Export `up()` and `down()` functions
- Keep constraints separate: table creation → foreign keys → indexes → triggers

**Kysely Usage:**
```typescript
import { db } from './db/index.js'

// CamelCasePlugin automatically converts camelCase to snake_case in queries:
const users = await db
  .selectFrom('users')          // Use camelCase. 
  .select(['fullName', 'personalEmail'])  // Use camelCase
  .where('isDeleted', '=', false)
  .execute()
```

**Important:** Raw SQL queries bypass CamelCasePlugin—use snake_case directly.

### Domain Model (High-Level)

**Core Hierarchy:**
```
University
└── Departments (CS, SE, etc.)
    ├── Programs (BS CS, MS CS, etc.)
    │   └── Classes (CS-7th-A, CS-7th-B)
    │       └── Students
    ├── Teachers
    └── Societies (IEEE, ACM)
```

**Communication Layer:**
```
Servers (Discord-like containers)
├── Department Server (auto-join for dept members)
├── Class Server (auto-join for class students)
└── Society Server (manual join via approval)
    └── Channels (#announcements, #cs-301, #general)
        └── Posts (title, content, attachments, priority)
```

**Role System:**
- **Academic Roles:** HOD, Program Director, CR, Society President/Convenor (stored in entity ownership columns like `departments.hod_id`)
- **Platform Roles:** Moderator (stored in RBAC tables: `user_roles`, `user_role_assignments`)
- **Scoping:** Platform roles are scoped to be server-level or channel-level
- **Permissions:** Academic permissions are hard-coded business logic; platform permissions use RBAC

### Key Business Rules

See `docs/functional_requirements.md` for complete specifications. Critical rules:

1. **Unique Roles:** Each department has exactly one HOD, each program one PD, each class one CR, each society one President and one Convenor
2. **Auto-Membership:** Students/teachers auto-join department/class servers based on academic info
3. **Soft Deletes:** Users, servers, societies, channels, and posts use `is_deleted` flags. Checkout `docs/entity_deletion_rules.md` for detailed policies.
4. **Channel Types:**
   - `announcements`: Default channel, official notices only
   - `course`: Auto-created when course assigned to class
   - `program`: Auto-created for each program in department server
   - `general`: Discussion channels

4. **Posting Rights:** Derived from academic role + server/channel type. E.g., only HOD can post in department announcements, CRs can post only in class servers, etc.
5. **Semester Transitions:** Archives old course channels, creates new ones, clears teacher assignments

## Code Style & TypeScript

### TypeScript Strictness
```json
// tsconfig.json highlights:
"strict": true
"noUncheckedIndexedAccess": true     // Array access returns T | undefined
"exactOptionalPropertyTypes": true   // No undefined in optional props
"noImplicitReturns": true
"verbatimModuleSyntax": true         // Explicit type-only imports
```

**Type Imports:** Always use `import { type Foo }` for type-only imports (enforced by ESLint).

## Development Workflow

1. **Environment Setup:**
   ```bash
   cd server
   cp .env.example .env        # Edit with actual values
   docker compose up -d        # Start PostgreSQL
   npm ci
   npm run migrate:latest      # Initialize database
   ```

2. **Database Changes:**
   - Update `docs/schema.md` first (source of truth)
   - Run `npm run create:migration <name>`
   - Write `up()` and `down()` functions using snake_case
   - Test migration: `npm run migrate:up` then `npm run migrate:down`

3. **Type Changes:**
   - Update `types.ts` manually after schema changes
   - Export types: `Selectable<Table>`, `Insertable<Table>`, `Updateable<Table>`

## Critical References

- **Schema ERD:** `docs/schema.md` - Complete database design with relationships, constraints, foreign keys, and indexes
- **Functional Requirements:** `docs/functional_requirements.md` - Role permissions matrix and business rules
- **Deletion Rules:** `docs/entity_deletion_rules.md` - Soft vs hard delete policies per entity

**Graceful Shutdown:**
```typescript
// index.ts handles SIGTERM/SIGINT
const shutdown = () => {
  server.close(() => {
    db.destroy().then(() => process.exit(0))
  })
}
```
