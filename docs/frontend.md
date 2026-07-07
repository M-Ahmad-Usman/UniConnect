# Frontend Summary

## Canonical Sources
- Detailed architecture: `client/ARCHITECTURE.md`
- Frontend API integration contract: `client/API_CONTRACT.md`
- Backend-emitted API contract: `server/docs/FRONTEND_BACKEND_CONTRACT.md`
- Active release log: `docs/release_log.md`

## Current Architecture
- React 19, Vite 7, strict TypeScript.
- UI: shadcn/ui on Base UI primitives plus Tailwind CSS v4 through the official
  Vite plugin.
- Server state: TanStack Query v5.
- Client state: Zustand for auth and notification count.
- Routing: React Router v7 with auth, must-change-password, admin, and academic
  guards.
- Forms: React Hook Form with Zod resolver.
- HTTP: shared axios client in `client/src/api/client.ts`, always
  `withCredentials: true`.
- Realtime: Socket.IO client owned by `AuthGuard`.
- Tests: Vitest for unit/component slices and Playwright for browser-runtime
  flows.

## Implemented Frontend Modules
All planned frontend modules are implemented: foundation, auth, shell/navigation,
server/channel views, posts, notifications, profile/user management, admin CRUD,
society management, and role management.

## Current Product/UI Decisions
- Feature-based folder structure under `client/src/features`.
- TanStack Query owns server state; components do not call `apiClient` directly.
- Zustand is limited to small client-only state.
- Cookie-based auth only; no `localStorage` or `sessionStorage` auth tokens.
- Same-origin deployment remains the runtime default. Cross-origin deployment is
  documented but not enabled by extra frontend runtime configuration in Module 7.
- Role management lives outside admin routes because scoped managers can use it.
- Admin navigation is gated by backend capability data and active global admin
  staff role membership, not by `userType === 'ADMIN'`. The frontend user type
  enum is `STAFF | TEACHER | STUDENT`.
- Academic delegated workflows live under `/academics/*`; admin routes may wrap
  or redirect but must not be the only path.
- Rare academic/catalog deletion-impact reports are exposed through typed
  catalog API methods and TanStack Query hooks; visible destructive UI remains
  deferred.
- Society leadership changes stay in society workflows; generic role management
  handles HOD, Program Director, CR, and moderator roles.
- Post feeds use paginated APIs with load-more/infinite-style interaction.
- Server, channel, and post navigation uses UUIDv7 public IDs end to end.
- Archived channels appear in a separate collapsed history section. Their feeds
  remain readable, while write controls and realtime subscriptions are disabled.
- Playwright owns critical runtime verification for cookies, redirects, CSRF,
  guarded routes, and responsive/accessibility smoke flows.

## Accessibility and UI Standards
Use `client/ARCHITECTURE.md` for detailed rules. Current standards include:
- Semantic tabs and URL-backed tab state where applicable.
- Labels, `aria-invalid`, and stable validation messages for form controls.
- Focus-trapped dialogs with visible title/description and restore behavior.
- Keyboard-operable actions with accessible names for icon-only buttons.
- Loading, empty, retry, forbidden, and success states must exist in-page, not
  only as transient toasts.
- Theme state is stored in the `uniconnect_theme` cookie, not browser storage.

## Error and Telemetry Behavior
- `ApiError` preserves backend `code`, `message`, `details`, `statusCode`, and
  `requestId`.
- `client/src/lib/api-error.ts` maps stable backend codes to safe UI copy and
  retryability.
- Forms apply backend validation `details` to fields when available.
- Optional Sentry telemetry is disabled unless `VITE_SENTRY_DSN` is configured.
  Error events are scrubbed before sending.

## Current Maintenance Rules
- Run frontend commands inside `client/`.
- Keep endpoint functions in `client/src/api/endpoints`.
- Keep detailed frontend architecture decisions in `client/ARCHITECTURE.md`.
- Keep frontend integration examples and client behavior in `client/API_CONTRACT.md`.
- Keep role helpers centralized when checking Admin authority in UI code; do
  not reintroduce direct `UserType.ADMIN` comparisons.
- Log future release work in `docs/release_log.md`, not a frontend-local progress
  file.
