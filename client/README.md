# UniConnect Frontend

A Discord-like university communication platform for the Department of Computer Science at National Textile University.

**Status:** Module 0 complete, verified, and ready for Module 1

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Backend running on `http://localhost:4000`

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Verification Snapshot
- `npx tsc -b --pretty false` passes
- `npx eslint .` passes
- `npx prettier --check "src/**/*.{ts,tsx,css}"` passes
- `npm run build` passes
- `http://127.0.0.1:5173/api/health` returns the backend health payload through the Vite proxy

---

## Documentation

Comprehensive documentation is available in this directory:

| Document | Description |
|----------|-------------|
| **[PLAN.md](./PLAN.md)** | Complete development plan with all 10 modules, component specs, API integrations, and build order |
| **[PROGRESS.md](./PROGRESS.md)** | Implementation progress tracker, decisions log, and completion status |
| **[API_CONTRACT.md](./API_CONTRACT.md)** | Complete backend API reference with request/response examples and integration patterns |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Architecture decisions, design patterns, state management strategy, and best practices |
| **[../docs/dependency_version_audit.md](../docs/dependency_version_audit.md)** | Latest-version audit, upgrade notes, and deferred breaking changes |

---

## Technology Stack

- **Framework:** React 19 + Vite 7 + TypeScript 5.9
- **UI:** shadcn/ui + Tailwind CSS v4
- **Primitive layer:** Base UI via shadcn/ui v4
- **State Management:** TanStack Query v5 (server state) + Zustand (client state)
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod
- **Rich Text:** Tiptap
- **Real-time:** socket.io-client
- **HTTP:** axios

---

## Project Structure

```
client/
├── src/
│   ├── api/              # API integration layer (axios + endpoints)
│   ├── components/       # Shared components (ui, layout, shared)
│   ├── features/         # Feature modules (auth, posts, servers, etc.)
│   ├── hooks/            # Custom hooks (useAuth, usePermissions, etc.)
│   ├── lib/              # Utilities (socket, query-client, utils)
│   ├── stores/           # Zustand stores (auth, notifications)
│   ├── types/            # TypeScript type definitions
│   ├── routes/           # Route tree + guards
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── PLAN.md               # Development plan
├── PROGRESS.md           # Progress tracker
├── API_CONTRACT.md       # API reference
└── ARCHITECTURE.md       # Architecture guide
```

---

## Development Workflow

### Phase 1: Foundation (Week 1)
- **Module 0:** Project setup, axios, TanStack Query, Zustand, routing

### Phase 2: Core Shell (Week 2)
- **Module 1:** Authentication (login, password reset)
- **Module 2:** Layout & Navigation (Discord-like shell)

### Phase 3: Primary User Experience (Weeks 3-4)
- **Module 3:** Server & Channel Views
- **Module 4:** Posts & Announcements
- **Module 5:** Notifications

### Phase 4: Profile & Admin (Weeks 5-6)
- **Module 6:** User Profile & Management
- **Module 7:** Admin Dashboard & CRUD

### Phase 5: Extended Features (Week 7)
- **Module 8:** Society Management
- **Module 9:** Role Management

---

## Key Features

### User Features
- Implemented foundation: cookie-based auth plumbing with refresh interceptor
- Implemented foundation: protected route tree with auth, must-change-password, and admin guards
- Implemented foundation: shared error boundary, toast system, and placeholder app shell
- Implemented foundation: typed API client, Zustand stores, Socket.IO client, and backend-aligned type layer
- Planned next: feature pages, forms, and data hooks for authentication and app workflows

### Admin Features
- Planned: system dashboard with statistics
- Planned: user management with create, deactivate, and bulk import flows
- Planned: department, program, and discipline CRUD
- Planned: class management with semester progression
- Planned: course management and assignments
- Planned: role assignment with scoped permissions
- Planned: society management

---

## Scripts

```bash
# Development
npm run dev              # Start dev server at localhost:5173
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm run format           # Format source files
npm run format:check     # Check formatting
```

Planned after Module 0 foundation setup:

```bash
npm run test             # Unit and component tests
npm run test:coverage    # Coverage report
npm run test:e2e         # Critical flow end-to-end tests
```

---

## Environment Variables

Local development should default to the Vite proxy so the browser talks to the frontend origin while `/api` and `/socket.io` are proxied to the backend.

Recommended production topology: serve frontend and backend from the same origin. This fits the backend's cookie model and avoids cross-site cookie and Socket.IO complications.

Only add explicit origin variables if you intentionally choose a separate API or socket origin later:

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

---

## Module Completion Status

| Module | Status |
|--------|--------|
| Module 0: Project Foundation | ✅ Complete |
| Module 1: Authentication | ⏳ Not Started |
| Module 2: Layout & Navigation | ⏳ Not Started |
| Module 3: Server & Channel Views | ⏳ Not Started |
| Module 4: Posts & Announcements | ⏳ Not Started |
| Module 5: Notifications | ⏳ Not Started |
| Module 6: User Profile & Management | ⏳ Not Started |
| Module 7: Admin Dashboard & CRUD | ⏳ Not Started |
| Module 8: Society Management | ⏳ Not Started |
| Module 9: Role Management | ⏳ Not Started |

**Progress:** 1/10 modules complete

---

## Backend Integration

The backend is fully complete with:
- 13 modules implemented
- 447 passing tests
- 35 hardening steps completed
- Complete API contract documented

Backend documentation:
- [Backend Contract](../server/docs/FRONTEND_BACKEND_CONTRACT.md)
- [Error Codes](../server/docs/API_ERROR_CODES.md)
- [Architecture](../server/API_DEVELOPMENT_PLAN.md)

---

## Next Steps

1. **Read the documentation:**
   - Start with [PLAN.md](./PLAN.md) for the big picture
   - Review [API_CONTRACT.md](./API_CONTRACT.md) for backend integration
   - Study [ARCHITECTURE.md](./ARCHITECTURE.md) for design patterns

2. **Continue with Module 1:**
   - Build login, forgot-password, reset-password, and change-password flows
   - Add auth endpoint helpers and React Query hooks
   - Connect login/logout flows to auth store and Socket.IO lifecycle

3. **Track progress in [PROGRESS.md](./PROGRESS.md)**

---

## Team

- **Muhammad Ahmad** - Lead Developer
- **Awais Hanif** - Developer
- **Wasif Ali** - Developer
- **Supervisor:** Mr. Nasir Mahmood
- **Co-Supervisor:** Dr. Hamid Ali

**Department of Computer Science**
**National Textile University**
**Session 2025-2026**

---

## License

This project is developed as part of the Final Year Project for the Department of Computer Science, National Textile University.
