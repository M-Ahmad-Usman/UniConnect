# UniConnect — Codex Agent Context

## Project Overview
UniConnect is a Discord-like university communication platform for National Textile University (NTU), Faisalabad. It organizes official announcements into servers (departments, classes, societies) and channels, with fine-grained role-based access control.

## Monorepo Structure
The production web system is a two-app monorepo. Each app is fully independent — no shared packages, no root workspace. A `mobile/` Capacitor wrapper also exists but is outside web/server redesign phases unless a task explicitly includes it.

```
uniconnect/
├── client/          # React 19 + Vite frontend
├── server/          # Express 5 + Prisma backend
├── docs/            # Shared documentation
├── Dockerfile       # Multi-stage production image (root of repo)
├── .dockerignore    # Docker build context exclusions
├── .github/
│   └── workflows/
│       └── deploy-azure.yml  # CI/CD pipeline
└── AGENTS.md        # This file
```

**CRITICAL:** Always `cd` into the correct workspace before running commands.
- Backend commands: run inside `server/`
- Frontend commands: run inside `client/`
- Never run commands from the repo root.
- Make sure that every command exits cleanly and doesn't leak any memory or leave open handles. Don't run heavy commands like linting, building and testing simultaneously. Running multiple heavy commands simulataneoulsy makes the system unresponsive
- Always try to save context. Don't try to read the full output of long commands like `npm test`. Only read the relevant chunk like using `npm test 2>&1 | tail -40`. If all tests pass then `tail -40` is enough but if any test fail then you can update the command to find the failing tests. You can use `grep` or any other tool or even read the whole command output if necessary. Rerunning the command with updated flags is cheaper than trying to read the whole output in one go. Using `2>&1 | tail -<number>` isn't a hard constraint. You can use any other more better way if you found any. The goal is to save context.

## Tech Stack

### Backend (`server/`)
- **Runtime:** Node.js, native ESM (`"type": "module"`)
- **Framework:** Express 5 (async-aware, no need for try/catch in route handlers)
- **Language:** TypeScript (strict mode)
- **ORM:** Prisma 7 with PostgreSQL (`@prisma/adapter-pg`)
- **Validation:** Zod 4
- **Auth:** JWT via httpOnly cookies (`access_token` at `/api`, `refresh_token` at `/api/auth/refresh`)
- **Realtime:** Socket.IO
- **Email:** Resend
- **File uploads:** Multer + Cloudinary
- **Testing:** Jest + Supertest (integration tests)
- **Package manager:** npm

### Frontend (`client/`)
- **Framework:** React 19 + Vite 7
- **Language:** TypeScript 5.9 (strict mode)
- **Server state:** TanStack Query v5
- **Client state:** Zustand
- **Routing:** React Router v7
- **UI:** shadcn/ui (Base UI stack) + Tailwind CSS v4 (official Vite plugin)
- **Forms:** React Hook Form + Zod (resolver)
- **Rich text:** Tiptap (StarterKit + CharacterCount + Placeholder)
- **HTTP:** axios (`withCredentials: true`, interceptors for 401 refresh retry)
- **Realtime:** Socket.IO client
- **Unit tests:** Vitest
- **E2E tests:** Playwright (Chromium)
- **Package manager:** npm

## Backend Architecture

### Request Flow
```
Route → validate(zodSchema) → authenticate → authorize → Controller → Service → Prisma → DB
```

### Module Layout
Every feature module lives under `server/src/modules/<name>/` with exactly these files:
```
<name>.routes.ts      # Express router, middleware chain
<name>.controller.ts  # HTTP handlers — thin, return typed responses
<name>.service.ts     # Business logic — Prisma queries, throw typed errors
<name>.schema.ts      # Zod validation schemas
<name>.listener.ts    # Event listeners (optional, some modules only)
```

### Controller Pattern
Controllers are HTTP-thin. They call one service function, shape the response, and return.
```typescript
export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const user = await userService.createUser(req.body);
  const response: ApiResponse<typeof user> = { success: true, data: user, message: 'User created' };
  res.status(StatusCodes.CREATED).json(response);
}
```

### Service Pattern
Services own all business logic and Prisma calls. They throw typed errors, never touch `req`/`res`.
```typescript
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('Email already exists');
  return prisma.user.create({ data: input, select: userDetailSelect });
}
```

### Route Pattern
```typescript
router.post(
  '/',
  authenticate,
  authorize({ userTypes: ['ADMIN'] }),
  validate(createUserSchema),
  handleCreateUser
);
```
`ADMIN` in route authorization is an effective runtime role. Persisted
`User.userType` values are `STAFF`, `TEACHER`, and `STUDENT`; Admin authority
comes from an active global staff-role assignment.

### Error Classes
Always use typed errors from `src/shared/errors/index.ts`. Never build ad-hoc error responses.
- `NotFoundError` → 404
- `UnauthorizedError` → 401
- `ForbiddenError` → 403
- `ConflictError` → 409
- `ValidationError` → 400 (with field details)

### Response Contract
```typescript
// Success
{ success: true, data: T, message?: string }

// Paginated
{ success: true, data: T[], pagination: { page, limit, total, totalPages } }

// Error
{ success: false, error: { code: string, message: string, details?: [] } }
```

### Validation Schemas (Zod 4)
```typescript
export const createUserSchema = {
  body: z.object({ fullName: z.string().min(1), email: z.string().email() }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: paginationQuerySchema.extend({ userType: userTypeEnum.optional() }),
};
```

### Logging
Backend application logs use Pino through `server/src/config/logger.ts`.
Create module loggers with `getModuleLogger('<module>')` and log errors as
`logger.error({ err }, 'message')`.
```typescript
const authLogger = getModuleLogger('auth');
authLogger.warn({ reason: 'invalid_credentials' }, 'Failed login attempt');
authLogger.error({ err, userId }, 'Failed to send reset-password email');
```
Production logs are JSON to stdout. Development uses `pino-pretty`. Tests default
to silent logging. Do not log passwords, tokens, cookies, auth headers, request
bodies, emails, names, roll numbers, raw queries, or upload/post content.

### Prisma Rules
- Always use explicit `select` or `include` — never return the full Prisma model.
- Multi-write flows must use Prisma transactions.
- Use `@prisma/adapter-pg` — the project uses the Prisma driver adapter pattern.
- ESM imports use `.js` extension: `import { prisma } from '../config/prisma.js'`
- Enum-like values use Prisma enums or string literals matching the schema.
- When applying existing migrations: `npm run db:migrate` (dev) or `npm run db:migrate:test` (test DB).
- When creating a new Prisma migration after intentional schema edits: `npm run db:migrate:dev -- --name <change-name>`.
    - In CI and production, migrations run via `npx prisma migrate deploy` with `DATABASE_URL` set directly in the environment — not via the npm scripts, which use dotenv-cli.

### TypeScript Rules (Backend)
- Native ESM: all source imports must include `.js` extension.
- Use `import type` for type-only imports.
- `strict: true` — no `any`, use `unknown` + type guards.
- Path alias: `@/*` maps to `src/*`.

## Frontend Architecture

### Feature Module Structure
```
client/src/features/<feature>/
├── pages/           # Route-level page components
├── components/      # Feature-specific components
├── hooks/           # Custom hooks (useLogin, useChannelPosts, etc.)
├── schemas.ts       # Zod validation schemas
└── __tests__/       # Vitest unit tests
```

### State Management
- **Server state:** TanStack Query (all API data — caching, mutations, invalidation)
- **Client state:** Zustand (auth user, notification unread count)
- **URL state:** React Router `useSearchParams` (filters, search, pagination)

### API Layer
All requests go through `client/src/api/client.ts` (axios instance).
Domain-specific functions live in `client/src/api/endpoints/<resource>.api.ts`.

```typescript
// src/api/endpoints/posts.api.ts
export const postsApi = {
  list: (channelId: number, params: PostListParams) =>
    apiClient.get(`/channels/${channelId}/posts`, { params }),
  create: (channelId: number, formData: FormData) =>
    apiClient.post(`/channels/${channelId}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
```

### Query Hook Pattern
```typescript
export function useChannelPosts(channelId: number | null) {
  return useQuery({
    queryKey: queryKeys.posts.byChannel(channelId),
    queryFn: () => postsApi.list(channelId!),
    enabled: channelId !== null,
  });
}
```

### Mutation Hook Pattern
```typescript
export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => { setUser(user); navigate(ROUTES.SERVERS); },
  });
}
```

### TypeScript Rules (Frontend)
- `strict: true` + `noUncheckedIndexedAccess: true`
- Path alias: `@/*` maps to `src/*`
- Use `import type` for type-only imports.
- Enums as const objects:
  ```typescript
  export const UserType = { STAFF: 'STAFF', TEACHER: 'TEACHER', STUDENT: 'STUDENT' } as const;
  export type UserType = (typeof UserType)[keyof typeof UserType];
  ```
- Tailwind v4 is imported via `@import 'tailwindcss';` in `src/index.css` — never via PostCSS config.

### Forms
React Hook Form + Zod resolver. Never use uncontrolled inputs outside of RHF.
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { email: '', password: '' },
});
```

### Styling
Tailwind CSS + shadcn/ui + CVA for variants. Use `cn()` from `@/lib/utils` for conditional classes.
```typescript
cn('base-classes', condition && 'conditional-class', className)
```

### Realtime (Socket.IO)
- Socket lifecycle is owned by `AuthGuard`, not `AppShell`.
- `connectSocket()` / `disconnectSocket()` live in `src/lib/socket.ts`.
- Socket connects **only** for fully authenticated users who do NOT have `mustChangePassword === true`.
- Core events: `notification:new`, `notification:unread-count`, `auth:expired`.
- Channel-scoped feed updates use a `useChannelPostRealtime` hook.

## Naming Conventions

| Element | Convention | Examples |
|---------|------------|---------|
| React components/pages | PascalCase | `LoginForm`, `ServerListPage` |
| Component files | PascalCase.tsx | `LoginForm.tsx`, `AppShell.tsx` |
| Hooks | `use` + PascalCase | `useLogin`, `useChannelPosts` |
| Stores | `use` + PascalCase + `Store` | `useAuthStore`, `useNotificationStore` |
| API endpoint objects | camelCase + `Api` | `authApi`, `serversApi` |
| Types/Interfaces | PascalCase | `AuthUser`, `CreatePostInput` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `MAX_FILE_SIZE` |
| Backend handlers | `handle` + PascalCase | `handleCreateUser`, `handleLogin` |
| Backend services | verb + Noun | `createUser`, `listPosts`, `getUserById` |
| Backend files | kebab-case.ts | `auth.controller.ts`, `user.service.ts` |

## Import Order (Frontend — enforced by ESLint)
```typescript
// 1. React and external libraries
import { useState } from 'react';
import { useForm } from 'react-hook-form';

// 2. Internal shared (UI, lib, types)
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/types';

// 3. Feature-specific
import { useLogin } from '@/features/auth/hooks/useLogin';

// 4. Relative imports
import { PasswordField } from './PasswordField';
```

## Commands Reference

### Backend (`server/`)
| Task | Command |
|------|---------|
| Install | `npm ci` |
| Start DB | `docker compose up -d` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Coverage | `npm run test:coverage` |
| Apply dev DB migrations | `npm run db:migrate` |
| Create dev DB migration | `npm run db:migrate:dev -- --name <change-name>` |
| Test DB migration | `npm run db:migrate:test` |
| Seed | `npm run db:seed` |
| Dev server (e2e mode) | `npm run dev:e2e` |
| Single Jest test | `npm test -- tests/modules/file.test.ts` |

### Frontend (`client/`)
| Task | Command |
|------|---------|
| Install | `npm ci` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Type-check | `npm run type-check` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| Single Vitest | `npx vitest run path/to/test.ts` |
| Single Playwright | `npx playwright test e2e/file.spec.ts` |

## Authentication Model
- Cookie-based auth. Frontend never handles tokens directly.
- `access_token` cookie (path `/api`, 15 min), `refresh_token` cookie (path `/api/auth/refresh`, 7 days).
- Frontend axios client uses `withCredentials: true` and auto-refreshes on 401.
- After any password change: backend clears all cookies, user must re-login.
- If `mustChangePassword === true` after login: backend blocks all routes except `/api/auth/change-password` with 403. Do NOT connect Socket.IO until user logs in again after changing password.

## What NOT to Do

### Backend
- Do NOT use `any` type — use `unknown` + type guards.
- Do NOT build ad-hoc error response objects in services — throw typed errors from `shared/errors/`.
- Do NOT omit `.js` extension on ESM imports.
- Do NOT put business logic in controllers.
- Do NOT fetch more Prisma fields than needed — always use explicit `select`/`include`.
- Do NOT use raw SQL strings unless there is a documented reason.
- Do NOT skip the `validate` middleware for routes that accept user input.
- Do NOT use `console.log`, `console.warn`, or `console.error` for backend runtime logs. Use Pino module loggers from `config/logger.ts`; only minimal pre-logger bootstrap failures may use console.

### Frontend
- Do NOT use `any` type.
- Do NOT use `localStorage` or `sessionStorage` — auth is cookie-based.
- Do NOT manage server state with `useState` + `useEffect` — use TanStack Query.
- Do NOT call `apiClient` directly inside components — go through endpoint functions in `api/endpoints/`.
- Do NOT render unsanitized HTML — always use DOMPurify for post content.
- Do NOT use offset pagination — the backend uses page/limit pagination, use `useSearchParams` to track page.
- Do NOT forget `withCredentials: true` — all requests must send cookies.
- Do NOT connect Socket.IO in `AppShell` or page components — it is managed by `AuthGuard`.

## Testing Requirements
- All new backend features require Jest integration tests in `server/tests/modules/` before merging.
- All new frontend features require Vitest unit tests in `__tests__/` folders.
- E2E Playwright coverage required for high-risk runtime flows (auth, route guards, cookie behavior).
- Rate limits are disabled when `NODE_ENV === 'test'`.
- Backend test DB is isolated: uses `server/.env.test`, separate `uniconnect_test` database.
- Playwright uses isolated backend on port 4100 via `server/.env.e2e`.

## Code Style
- Prettier: single quotes, semicolons, trailing commas, 100 char width.
- Write self-documenting code — JSDoc only for complex/non-obvious functions.
- Avoid magic numbers — use constants from `server/src/shared/constants.ts` or `client/src/lib/constants.ts`.

## Deployment Architecture
UniConnect is deployed as a Docker container on Azure App Service. The CI/CD
pipeline runs on every push to `main` and every pull request:

```
push to main / pull request
  ├── integration-tests   Jest + PostgreSQL 18 service container  → gates docker build
  ├── e2e-tests           Playwright (MS official container)       → informational on main, gates PRs
  ├── docker-build-push   Multi-stage image → ghcr.io             → needs: integration-tests
  └── deploy              migrate → update App Service → health   → needs: docker-build-push (main only)
```

Critical facts for agents working on deployment-related files:
- `Dockerfile` and `.dockerignore` are at the **repository root**.
- `prisma generate` runs explicitly in Docker Stage 2. There is no `postinstall`
  script — omitting it from the Dockerfile causes a runtime crash.
- The Prisma client lands in `node_modules/.prisma/client` (default location)
  and travels into the production stage with `node_modules`.
- Migrations run in the **deploy job**, not inside the image.
- Production database: `uniconnect_prod` on Azure PostgreSQL 18 (Central India).
- Live URL: `https://uni-connect.dev`
- Do not modify `Dockerfile`, `.dockerignore`, or `deploy-azure.yml` without
  reading `docs/deployment.md` first.

## Reference Documents
| Document | Location |
|----------|----------|
| Documentation index | `docs/README.md` |
| Release readiness | `docs/release_readiness.md` |
| Release log | `docs/release_log.md` |
| Security posture | `docs/security.md` |
| Backend summary | `docs/backend.md` |
| Frontend summary | `docs/frontend.md` |
| Deployment guide | `docs/deployment.md` |
| Azure concepts guide | `docs/azure_concepts.md` |
| Frontend architecture | `client/ARCHITECTURE.md` |
| Frontend implementation plan | `client/FRONTEND_IMPLEMENTATION_PLAN.md` |
| API contract | `client/API_CONTRACT.md` |
| Backend architecture | `server/BACKEND_ARCHITECTURE.md` |
| API error codes | `server/docs/API_ERROR_CODES.md` |
| Frontend-backend contract | `server/docs/FRONTEND_BACKEND_CONTRACT.md` |
| Database ERD | `docs/database_erd.md` |
| Functional requirements | `docs/functional_requirements.md` |
