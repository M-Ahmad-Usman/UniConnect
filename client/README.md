# UniConnect Frontend

A Discord-like university communication platform for the Department of Computer Science at National Textile University.

**Status:** Module 1 authentication complete, hardened, and ready for runtime behavior testing plus Module 2

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
- Implemented authentication: login, forgot-password, reset-password, forced password change, and voluntary password change flows
- Implemented authentication: typed auth and user endpoint helpers, React Query mutation hooks, password visibility toggles, and live password strength feedback
- Implemented hardening: public auth 401 refresh exclusions, safer Socket.IO reuse, explicit form refs for React Hook Form, and bundle chunk splitting for cleaner production builds
- Implemented foundation: shared error boundary, toast system, typed API client, Zustand stores, Socket.IO client, and backend-aligned type layer

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

Recommended Playwright bootstrap commands when the runtime test harness is added:

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

---

## Runtime Testing Recommendation

Use a three-layer approach rather than relying on one tool for everything.

1. Use unit tests for pure utilities, stores, and permission logic.
2. Use component and integration tests with Testing Library plus MSW for deterministic form and data-fetching behavior.
3. Use Playwright for browser-runtime behavior that only becomes real in an actual browser: cookie auth, redirects, route guards, token refresh, file uploads, responsive layout, and eventual Socket.IO flows.

Playwright is the right runtime layer for this project because UniConnect depends on browser cookies, navigation guards, network retries, and layout behavior that are difficult to validate reliably in jsdom-only tests.

Recommended scope for the first Playwright wave:

1. Login success and invalid-credentials flow.
2. Forced password change flow.
3. Forgot-password silent-success flow.
4. Reset-password valid and invalid token flow.
5. Logout and session-expiry redirect flow.

Recommended execution policy:

1. Run Chromium-only locally for fast feedback.
2. Add Firefox and WebKit on CI or release-candidate gates.
3. Record `trace: 'on-first-retry'`, `video: 'on-first-retry'`, and `screenshot: 'only-on-failure'`.
4. Use Playwright `webServer` to start or reuse the frontend and backend automatically.

---

## Agentic Playwright Workflow

For agent-driven development, use Playwright in two distinct modes.

1. Use committed Playwright tests as the source of truth for reproducible runtime verification.
2. Use Playwright codegen, VS Code Playwright tooling, and trace viewer to accelerate authoring and debugging.
3. Use Playwright MCP only as an optional exploratory sidecar when persistent browser state and live page introspection help more than raw token efficiency.

Recommended default for workflows like this one:

1. Author or update Playwright tests in the repo.
2. Run them from the terminal or VS Code test runner.
3. Inspect failures through the HTML report and trace viewer.
4. Use codegen to bootstrap locators or flow skeletons, then hand-clean the generated test.

Why this default is better than MCP-first:

1. Tests become versioned artifacts in the codebase.
2. Terminal and test-runner execution is easier to repeat in CI.
3. Trace files give better post-failure evidence than ad-hoc browser interaction logs.
4. The Playwright MCP project itself recommends CLI-based workflows for many coding-agent scenarios because they are usually more token-efficient, while MCP is better suited to exploratory or long-running browser sessions.

---

## Playwright on WSL2

Your environment, Ubuntu on WSL2, is a supported Playwright setup.

Recommended baseline:

1. Keep Node.js on a supported major version, which this repo already does with Node 20+.
2. Install Playwright with browser dependencies from inside Ubuntu:

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

3. Start with Chromium in headless mode for the least friction.

For headed mode, UI Mode, or `codegen` inside WSL2:

1. Ensure the distro is actually running on WSL2, not WSL1.
2. Update WSL from Windows PowerShell: `wsl --update`.
3. Restart WSL: `wsl --shutdown`.
4. Use WSLg-capable Windows 11 or a current Windows 10 build with GUI app support if you want browser windows to open from Ubuntu.
5. If GUI apps fail with display errors, fall back to headless execution first and debug with HTML reports plus traces.

Optional local quality-of-life commands:

```bash
npx playwright test --ui
npx playwright codegen http://127.0.0.1:5173/login
npx playwright show-report
npx playwright show-trace path/to/trace.zip
```

---

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
| Module 1: Authentication | ✅ Complete |
| Module 2: Layout & Navigation | ⏳ Not Started |
| Module 3: Server & Channel Views | ⏳ Not Started |
| Module 4: Posts & Announcements | ⏳ Not Started |
| Module 5: Notifications | ⏳ Not Started |
| Module 6: User Profile & Management | ⏳ Not Started |
| Module 7: Admin Dashboard & CRUD | ⏳ Not Started |
| Module 8: Society Management | ⏳ Not Started |
| Module 9: Role Management | ⏳ Not Started |

**Progress:** 2/10 modules complete

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

2. **Set up runtime testing:**
   - Add Playwright and browser binaries in the Ubuntu-on-WSL2 environment
   - Create the first critical auth-flow runtime tests
   - Configure trace capture and HTML reports for failure analysis

3. **Continue with Module 2:**
   - Build AppShell, navigation, and notification entry points
   - Keep expanding Playwright only for critical cross-route runtime flows

4. **Track progress in [PROGRESS.md](./PROGRESS.md)**

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
