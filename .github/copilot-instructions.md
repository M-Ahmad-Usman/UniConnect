# UniConnect Copilot Instructions

## Repository Overview

UniConnect is a university collaboration platform with two independent Node/TypeScript apps:
- `client/` — React 19 + Vite + TanStack Query + Zustand + Tailwind
- `server/` — Express 5 + Prisma + PostgreSQL + Socket.IO

Run all commands inside `client/` or `server/` (no root workspace orchestration).

## Commands

### Backend (`server/`)
| Task | Command |
|------|---------|
| Install | `npm ci` |
| Start DB | `docker compose up -d` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Tests | `npm test` |
| Coverage | `npm run test:coverage` |
| Dev DB migration | `npm run db:migrate` |
| Test DB migration | `npm run db:migrate:test` |
| Seed | `npm run db:seed` |
| Single Jest | `npm test -- tests/modules/file.test.ts` |
| Single Jest by name | `npm test -- tests/modules/file.test.ts -t "test name"` |

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
| Single Vitest by name | `npx vitest run path/to/test.ts -t "test name"` |
| Single Playwright | `npx playwright test e2e/file.spec.ts` |
| Single Playwright by name | `npx playwright test -g "test title"` |

## Architecture

### Authentication
- Cookie-based auth (not bearer tokens) for both REST and Socket.IO.
- Backend sets `access_token` (path `/api`) and `refresh_token` (path `/api/auth/refresh`).
- Frontend axios client uses `withCredentials: true` and auto-refreshes on 401.
- Refresh tokens are rotated and stored hashed; password reset tokens are one-time-use.

### Frontend (`client/src/`)
```
api/
├── client.ts           # Axios instance with interceptors
└── endpoints/          # Domain-specific API functions (auth.api.ts, users.api.ts, etc.)
components/
├── ui/                 # shadcn/ui primitives (button, input, dialog, etc.)
├── layout/             # AppShell, TopBar, Sidebars, AdminLayout
└── shared/             # ErrorBoundary, LoadingSpinner, EmptyState, ConfirmDialog
features/               # Feature modules (auth, servers, channels, posts, notifications, admin)
└── {feature}/
    ├── pages/          # Page components
    ├── components/     # Feature-specific components
    ├── hooks/          # Custom hooks (useLogin, useChannelPosts, etc.)
    ├── schemas.ts      # Zod validation schemas
    └── __tests__/
hooks/                  # Global hooks (useDebouncedValue, useMediaQuery)
lib/                    # Utilities (constants, query-client, socket, utils)
routes/
├── index.tsx           # Router definition
└── guards/             # AuthGuard, AdminGuard, GuestGuard, etc.
stores/                 # Zustand stores (auth.store.ts, notification.store.ts)
types/                  # TypeScript types organized by domain
```

**State management split:**
- Server state: TanStack Query (caching, refetching, mutations)
- Client state: Zustand (auth user, notification count)
- URL state: React Router search params

### Backend (`server/src/`)
```
config/                 # env, prisma, email, cloudinary
middleware/             # authenticate, authorize, validate, errorHandler, uploads, rateLimiter
modules/                # Feature modules (15 modules)
└── {module}/
    ├── {name}.routes.ts      # Express routes with middleware chain
    ├── {name}.controller.ts  # HTTP handlers (response shaping)
    ├── {name}.service.ts     # Business logic (data access)
    ├── {name}.schema.ts      # Zod validation schemas
    └── {name}.listener.ts    # Event listeners (optional)
shared/
├── errors/             # AppError, NotFoundError, ForbiddenError, etc.
├── types/              # Shared TypeScript types
├── utils/              # Utility functions
├── constants.ts        # Pagination limits, file constraints
└── events.ts           # Typed event emitter
socket/                 # Socket.IO setup and handlers
```

**Request flow:** Route → validate → authenticate → authorize → Controller → Service → Prisma

## Coding Conventions

### Naming

| Element | Convention | Examples |
|---------|------------|----------|
| Components/Pages | PascalCase | `LoginForm`, `ServerListPage` |
| Component files | PascalCase.tsx | `LoginForm.tsx`, `AppShell.tsx` |
| Hooks | use + PascalCase | `useLogin`, `useChannelPosts` |
| Hook files | camelCase.ts | `useLogin.ts`, `useDebouncedValue.ts` |
| Stores | use + PascalCase + Store | `useAuthStore`, `useNotificationStore` |
| API endpoints | camelCase + Api | `authApi`, `serversApi` |
| Types/Interfaces | PascalCase | `AuthUser`, `CreatePostInput` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `MAX_FILE_SIZE` |
| Server handlers | handle + PascalCase | `handleCreateUser`, `handleLogin` |
| Server services | verb + Noun | `createUser`, `listPosts`, `getUserById` |
| Server files | kebab-case.ts | `auth.controller.ts`, `user.service.ts` |

### TypeScript

- Strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`).
- Path alias: `@/*` maps to `src/*` in both apps.
- Use `import type` for type-only imports.
- Server uses native ESM: imports include `.js` extensions.
- Enums as const objects with derived types:
  ```typescript
  export const UserType = { TEACHER: 'TEACHER', STUDENT: 'STUDENT', ADMIN: 'ADMIN' } as const;
  export type UserType = (typeof UserType)[keyof typeof UserType];
  ```

### Import Order (Enforced)

Organize imports in this order with blank lines between groups:
```typescript
// 1. React and external libraries
import { useState } from 'react';
import { useForm } from 'react-hook-form';

// 2. Internal shared (UI, lib, types)
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import type { AuthUser } from '@/types';

// 3. Feature-specific
import { useLogin } from '@/features/auth/hooks/useLogin';
import { loginSchema } from '@/features/auth/schemas';

// 4. Relative imports
import { PasswordField } from './PasswordField';
```

### Frontend Patterns

**Components:** Functional components with hooks. Use composition over inheritance.

**Forms:** React Hook Form + Zod resolver:
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { email: '', password: '' },
});
```

**Data fetching:** TanStack Query with custom hooks:
```typescript
// Query hook
export function useChannelPosts(channelId: number | null) {
  return useQuery({
    queryKey: queryKeys.posts.byChannel(channelId),
    queryFn: () => postsApi.listByChannel(channelId!),
    enabled: channelId !== null,
  });
}

// Mutation hook
export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => { setUser(user); navigate(ROUTES.SERVERS); },
  });
}
```

**Query keys:** Use factory pattern from `lib/constants.ts`:
```typescript
queryKeys.posts.byChannel(channelId, params)
queryKeys.servers.detail(serverId)
```

**Styling:** Tailwind CSS + shadcn/ui + CVA for variants. Use `cn()` for conditional classes:
```typescript
cn("base-classes", condition && "conditional-class", className)
```

### Backend Patterns

**Controller:** Handle HTTP concerns, call services, return typed responses:
```typescript
export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const user = await userService.createUser(req.body);
  const response: ApiResponse<typeof user> = { success: true, data: user, message: "User created" };
  res.status(StatusCodes.CREATED).json(response);
}
```

**Service:** Business logic, Prisma queries, throw typed errors:
```typescript
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("Email already exists");
  return prisma.user.create({ data: input, select: userDetailSelect });
}
```

**Routes:** Middleware chain pattern:
```typescript
router.post("/", authenticate, authorize({ userTypes: ["ADMIN"] }), validate(createUserSchema), handleCreateUser);
```

**Errors:** Throw typed errors from `shared/errors/`:
- `NotFoundError` (404), `UnauthorizedError` (401), `ForbiddenError` (403)
- `ConflictError` (409), `ValidationError` (400 with details)

**Response contract:**
```typescript
// Success
{ success: true, data: T, message?: string }

// Paginated
{ success: true, data: T[], pagination: { page, limit, total, totalPages } }

// Error
{ success: false, error: { code: string, message: string, details?: [] } }
```

**Validation schemas:** Zod with structured exports:
```typescript
export const createUserSchema = {
  body: z.object({ fullName: z.string().min(1), email: z.string().email() }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: paginationQuerySchema.extend({ userType: userTypeEnum.optional() }),
};
```

**Logging:** Use prefixed console methods for traceability:
```typescript
console.warn("[AUTH] Failed login attempt", { email, reason: "invalid_credentials", timestamp: new Date().toISOString() });
```

### Testing Requirements

- All new features require tests before merging.
- Backend: Jest + Supertest integration tests in `server/tests/modules/`.
- Frontend: Vitest unit tests in `__tests__/` folders, Playwright E2E in `client/e2e/`.
- Test helpers: `server/tests/helpers/` for DB reset/seed utilities.
- Rate limits are disabled when `NODE_ENV === "test"`.

### Code Style

- Write self-documenting code with clear naming.
- Add JSDoc comments only for complex functions or non-obvious behavior.
- Prettier config: single quotes, semicolons, trailing commas, 100 char width.
- Avoid magic numbers; use constants from `shared/constants.ts` or `lib/constants.ts`.

## Reference Docs

| Document | Location |
|----------|----------|
| API contract | `client/API_CONTRACT.md`, `server/docs/FRONTEND_BACKEND_CONTRACT.md` |

### Frontend

| Document | Location |
|----------|----------|
| Frontend architecture | `client/ARCHITECTURE.md` |
| Development plan | `client/PLAN.md` |
| Development progress | `client/PROGRESS.md` |

### Backend

| Document | Location |
|----------|----------|
| Frontend architecture | `client/ARCHITECTURE.md` |
| Error codes | `server/docs/API_ERROR_CODES.md` |
| Backend development | `server/API_DEVELOPMENT_PLAN.md` |
| Backend progress | `server/PROGRESS.md` |
