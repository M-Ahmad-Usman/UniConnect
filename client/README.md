# UniConnect Frontend

A Discord-like university communication platform for the Department of Computer Science at National Textile University.

**Status:** Planning complete, documentation aligned, implementation pending

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
- Planned: cookie-based authentication with auto-refresh
- Planned: Discord-like server/channel navigation
- Planned: rich text post creation with attachments
- Planned: real-time notifications via Socket.IO
- Planned: user profile with avatar upload
- Planned: society join requests and membership
- Planned: notification preferences per server/channel
- Planned: search and filter posts by priority and date

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
| Module 0: Project Foundation | ⏳ Not Started |
| Module 1: Authentication | ⏳ Not Started |
| Module 2: Layout & Navigation | ⏳ Not Started |
| Module 3: Server & Channel Views | ⏳ Not Started |
| Module 4: Posts & Announcements | ⏳ Not Started |
| Module 5: Notifications | ⏳ Not Started |
| Module 6: User Profile & Management | ⏳ Not Started |
| Module 7: Admin Dashboard & CRUD | ⏳ Not Started |
| Module 8: Society Management | ⏳ Not Started |
| Module 9: Role Management | ⏳ Not Started |

**Progress:** 0/10 modules complete

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

2. **Begin Module 0:**
   - Replace the default Vite starter scaffold with the application foundation
   - Set up Tailwind and shadcn/ui
   - Configure axios with interceptors
   - Set up TanStack Query and Zustand
   - Create type definitions

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
