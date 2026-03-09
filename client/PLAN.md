# UniConnect Frontend Development Plan

**Version:** 1.0
**Last Updated:** 2026-03-10
**Project:** UniConnect - University Communication Platform
**Target Users:** Department of Computer Science, NTU (~1000 students, ~75 faculty)

---

## Table of Contents

1. [Project Context](#project-context)
2. [Technology Stack](#technology-stack)
3. [Architecture Principles](#architecture-principles)
4. [Module Breakdown](#module-breakdown)
5. [Build Order & Timeline](#build-order--timeline)
6. [Verification Criteria](#verification-criteria)
7. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

## Project Context

UniConnect is a Discord-like platform for official university announcements organized into servers (departments, classes, societies) and channels. The backend is fully complete with:
- **13 modules** fully implemented and tested
- **447 passing tests** with comprehensive coverage
- **35 hardening steps** completed (performance, security, reliability)
- **Complete API contract** with documented endpoints and response shapes

### Functional Requirements Coverage

This frontend implementation will satisfy **all 76 functional requirements** across:
- Authentication (FR-1 to FR-8)
- Server Management (FR-9 to FR-18)
- Channel Management (FR-19 to FR-34)
- Posts & Announcements (FR-35 to FR-42)
- Notifications (FR-43 to FR-48)
- Search & Filter (FR-49 to FR-51)
- User Profile (FR-52 to FR-57)
- Role Management (FR-58 to FR-63)
- Society Membership (FR-64 to FR-69)
- Semester Transition (FR-70 to FR-73)
- Admin Dashboard (FR-74 to FR-76)

---

## Technology Stack

### Core Framework
- **React 19** - Latest with improved hooks and concurrent features
- **Vite 7** - Fast dev server, optimized builds
- **TypeScript 5.9** - Type safety matching backend patterns
- **ESLint + Prettier** - Code quality and consistency

### UI & Styling
- **Tailwind CSS v4** - Utility-first CSS with JIT compilation
- **shadcn/ui** - Accessible, composable component primitives (current v4 stack uses Base UI)
- **Lucide React** - Icon library
- **Framer Motion** - Animations for modals, transitions, toasts

### State Management
- **TanStack Query v5** (React Query) - Server state management, caching, background refetching
- **Zustand** - Lightweight client state (auth, notifications)
- **React Router v7** - Type-safe routing with loaders and actions

### Forms & Validation
- **React Hook Form** - Performant form handling with minimal re-renders
- **Zod** - Schema validation (shared with backend)

### Rich Text & Media
- **Tiptap** - Headless rich text editor (ProseMirror-based)
- **DOMPurify** - XSS protection for rendered HTML
- **react-dropzone** - File upload drag-and-drop

### Real-time & HTTP
- **axios** - HTTP client with interceptors for auth and error handling
- **socket.io-client** - WebSocket client for real-time notifications

### Developer Experience
- **TypeScript strict mode** - Maximum type safety
- **Path aliases** (`@/components`, `@/lib`, etc.)
- **Hot module replacement** - Instant feedback during development

---

## Architecture Principles

### 1. Feature-Based Organization
```
src/
  features/
    auth/          # All auth-related pages, components, hooks co-located
    servers/       # Server views and components
    posts/         # Post feed and creation
```
Benefits: Easy to find related code, clear module boundaries, scalable as the app grows.

### 2. API Layer Separation
All backend communication goes through a dedicated API layer:
- `api/client.ts` - Configured axios instance with interceptors
- `api/endpoints/` - One file per resource (auth.api.ts, servers.api.ts, etc.)
- Automatic 401 handling with token refresh retry
- Error normalization into consistent `ApiError` shape

### 3. Type Safety from Backend to Frontend
- Mirror all backend response types in `src/types/`
- No `any` types - use `unknown` and narrow with type guards
- Zod schemas shared between form validation and runtime checks

### 4. Permission-Aware UI
- `usePermissions()` hook checks user roles and type
- `<Can action="...">` wrapper component for conditional rendering
- Admin bypass: admins see all management actions
- Scoped roles: HOD/CR/Moderator/President see actions in their scope

### 5. Optimistic Updates with Rollback
- TanStack Query mutations update cache optimistically
- Automatic rollback on error
- Background refetch on window focus for stale data

### 6. Accessible by Default
- shadcn/ui components built on Base UI primitives in the current v4 stack (WAI-ARIA aligned)
- Keyboard navigation for all interactive elements
- Focus management in modals and dropdowns
- Screen reader announcements for dynamic content

---

## Module Breakdown

### Module 0: Project Foundation

**Estimated Effort:** 2-3 days
**Dependencies:** None

#### Deliverables
1. **Vite Project Setup**
   - React 19 + TypeScript 5.9
   - Tailwind CSS v4 with JIT
   - Vite proxy: `/api` → `http://localhost:4000`, `/socket.io` → WebSocket proxy
   - Path aliases: `@/*` → `src/*`

2. **shadcn/ui Installation**
   - Initialize shadcn/ui with Tailwind v4 config
   - Install primitive components: Button, Card, Dialog, Input, Label, Select, Textarea, Toast

3. **Axios Instance** (`src/api/client.ts`)
   - Base URL: `/api` (proxied to backend in dev)
   - `withCredentials: true` (sends httpOnly cookies)
   - **Response interceptor:**
     - Success: unwrap `{ success: true, data }` → return `data`
     - Error: normalize into `ApiError { code, message, details, statusCode }`
   - **401 interceptor:**
     - Attempt `POST /api/auth/refresh`
     - Retry original request once
     - If refresh fails: clear auth state, redirect to `/login`

4. **TanStack Query Setup** (`src/lib/query-client.ts`)
   ```typescript
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000,      // 5 minutes
         gcTime: 10 * 60 * 1000,         // 10 minutes garbage collection
         retry: 1,
         refetchOnWindowFocus: false,
       },
     },
   });
   ```

5. **Zustand Stores**
   - `src/stores/auth.store.ts`:
     ```typescript
     interface AuthState {
       user: AuthUser | null;      // { id, fullName, email, userType, mustChangePassword }
       isAuthenticated: boolean;
       isLoading: boolean;
       setUser: (user: AuthUser) => void;
       clearUser: () => void;
     }
     ```
   - `src/stores/notification.store.ts`:
     ```typescript
     interface NotificationState {
       unreadCount: number;
       setUnreadCount: (count: number) => void;
       incrementUnread: () => void;
       decrementUnread: () => void;
     }
     ```

6. **Socket.IO Client** (`src/lib/socket.ts`)
  - Connect with `withCredentials: true` using same-origin `/socket.io` by default
  - Server joins the socket to room `user:{userId}` after successful authentication
   - Event listeners: `notification:new`, `notification:unread-count`, `auth:expired`
   - Graceful disconnect on logout

7. **Type Definitions** (`src/types/`)
   - Mirror all backend response shapes from `server/src/shared/types/index.ts`
   - Key types:
     - `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiErrorResponse`
     - `AuthUser`, `UserProfile`, `UserType`, `Gender`
     - `Server`, `ServerDetail`, `ServerType`, `Channel`, `ChannelType`
     - `PostListItem`, `PostDetail`, `PostPriority`, `PostAttachment`
     - `Notification`, `NotificationType`, `NotificationPreference`
     - All enums: `UserType`, `ServerType`, `ChannelType`, `PostPriority`, `Section`, etc.

8. **Route Tree** (`src/routes/index.tsx`)
   - React Router v7 setup with layout routes
   - Public routes: `/login`, `/forgot-password`, `/reset-password`
   - Protected routes (wrapped in `<AuthGuard>`):
     - `/` - Default/home redirect
     - `/servers/:serverId` - Server view
     - `/servers/:serverId/channels/:channelId` - Channel view
     - `/servers/:serverId/members` - Member list
     - `/profile` - Own profile
     - `/settings/password` - Change password
     - `/settings/notifications` - Notification preferences
     - `/admin/*` - Admin section (wrapped in `<AdminGuard>`)
   - `<MustChangePasswordGuard>` redirects to `/change-password` if `mustChangePassword === true`

9. **Route Guards** (`src/routes/guards/`)
   - `AuthGuard.tsx` - Checks auth state, attempts `GET /api/users/me`, redirects to `/login` on 401
   - `MustChangePasswordGuard.tsx` - Redirects to `/change-password` if user must change password
   - `AdminGuard.tsx` - Checks `user.userType === "ADMIN"`, shows 403 or redirects if not admin

10. **Error Boundary** (`src/components/shared/ErrorBoundary.tsx`)
    - Catches React render errors
    - Shows friendly error UI with "Reload" button
    - Logs errors to console (future: send to error tracking service)

11. **Toast System** (`src/components/ui/sonner.tsx`)
    - shadcn/ui Sonner integration
    - Global toast provider in `App.tsx`
    - TanStack Query `onError` callback fires toasts for unhandled API errors

12. **Shared Components** (`src/components/shared/`)
    - `EmptyState.tsx` - For empty lists, 404s
    - `LoadingSpinner.tsx` - Full-page and inline variants
    - `ConfirmDialog.tsx` - Reusable confirmation modal
    - `RoleBadge.tsx` - Colored badge for roles (HOD, CR, President, Moderator, etc.)

#### Verification Targets
- `npm run dev` starts without errors
- Vite proxy connects to backend `http://localhost:4000`
- Test API call `GET /api/health` returns `{ success: true }`
- `npm run type-check` passes
- Tailwind CSS classes render correctly

---

### Module 1: Authentication

**Estimated Effort:** 2-3 days
**Dependencies:** Module 0

**Implementation Status:** Completed, hardened, and runtime-verified on 2026-03-10 with focused Playwright coverage for the highest-value auth journeys.

#### Routes
| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/login` | `LoginPage` | No |
| `/forgot-password` | `ForgotPasswordPage` | No |
| `/reset-password?token=xxx` | `ResetPasswordPage` | No |
| `/change-password` | `ForceChangePasswordPage` | Special (mustChangePassword gate) |
| `/settings/password` | `ChangePasswordPage` | Yes |

#### Components
- **`LoginForm`** (`src/features/auth/components/LoginForm.tsx`)
  - Email + password fields
  - React Hook Form + Zod validation (mirrors `loginSchema` from backend)
  - Submit → `POST /api/auth/login`
  - On success: store user and redirect based on `mustChangePassword`
  - Error handling: invalid credentials, rate limiting, network errors

- **`ForgotPasswordForm`** (`src/features/auth/components/ForgotPasswordForm.tsx`)
  - Email input
  - Submit → `POST /api/auth/forgot-password`
  - Silent success (no email enumeration) - always shows "Reset link sent" message
  - Security note: backend rate-limited to 5 req/15min

- **`ResetPasswordForm`** (`src/features/auth/components/ResetPasswordForm.tsx`)
  - Reads `token` from URL query param
  - New password field with strength indicator
  - Submit → `POST /api/auth/reset-password`
  - On success: redirect to `/login` with success message

- **`ChangePasswordForm`** (`src/features/auth/components/ChangePasswordForm.tsx`)
  - Used in both forced and voluntary password change flows
  - Current password + new password fields
  - Submit → `PATCH /api/auth/change-password`
  - On success: backend clears cookies → redirect to `/login`

- **`PasswordStrengthIndicator`** (`src/features/auth/components/PasswordStrengthIndicator.tsx`)
  - Visual indicator (weak/medium/strong)
  - Matches backend rules: 8+ chars, lowercase, uppercase, digit, special char
  - Real-time feedback as user types

- **`AuthLayout`** (`src/features/auth/components/AuthLayout.tsx`)
  - Centered card layout for unauthenticated pages
  - UniConnect logo/branding
  - Background gradient or pattern

#### API Integrations
```typescript
// src/api/endpoints/auth.api.ts
export const authApi = {
  login: (credentials: LoginRequest) =>
    axios.post<LoginResponse>('/auth/login', credentials),

  logout: () =>
    axios.post('/auth/logout'),

  refresh: () =>
    axios.post('/auth/refresh'),

  forgotPassword: (email: string) =>
    axios.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    axios.post('/auth/reset-password', { token, newPassword }),

  changePassword: (currentPassword: string, newPassword: string) =>
    axios.patch('/auth/change-password', { currentPassword, newPassword }),
};
```

#### State Management
- **Zustand Auth Store** (`src/stores/auth.store.ts`)
  - Set user on successful login
  - Clear user on logout
  - `isLoading` flag during initial session check

- **TanStack Query Mutations**
  - `useLogin()` - Handles login mutation, updates auth store
  - `useLogout()` - Clears store, disconnects socket, clears query cache, redirects
  - `useChangePassword()` - Clears store after success (forces re-login)

#### Key Behaviors
1. **Login Flow**
   - Submit credentials → backend returns user data + sets httpOnly cookies
   - Store user in Zustand
  - If `mustChangePassword === true`: redirect to `/change-password` and do not connect Socket.IO
  - Else: connect Socket.IO and redirect to `/` (default server list)

2. **mustChangePassword Gate**
   - After login, if flag is true, backend blocks all routes except `/change-password` with 403
   - Frontend `MustChangePasswordGuard` enforces redirect
   - After password change, backend clears cookies → user must log in again with new password

3. **401 Handling (Token Refresh)**
   - Axios interceptor catches 401 responses
   - Attempts `POST /api/auth/refresh` (using `refresh_token` cookie)
   - If successful: retries original request once
   - If refresh fails: clear auth state, redirect to `/login`

4. **Logout Flow**
   - `POST /api/auth/logout` (backend revokes refresh token, clears cookies)
   - Clear Zustand auth store
   - Disconnect Socket.IO
   - Clear TanStack Query cache
   - Redirect to `/login`

#### Zod Schemas
```typescript
// src/features/auth/schemas.ts
export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Must contain a special character");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
}).refine(d => d.currentPassword !== d.newPassword, {
  message: "New password must differ from current",
  path: ["newPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});
```

#### Verification
- ✅ Login with valid credentials → redirects to server list
- ✅ Login with invalid credentials → shows error message
- ✅ Login with temp password → forced to `/change-password`
- ✅ Forgot password → sends email (check backend logs in dev)
- ✅ Reset password with valid token → redirects to login
- ✅ Reset password with expired/invalid token → shows error
- ✅ Change password → logs out and redirects to login
- ✅ 401 on any API call → attempts refresh, retries, redirects to login if refresh fails
- ✅ Logout → clears session, disconnects socket, redirects to login

---

### Module 2: Layout & Navigation

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1

#### Components

##### `AppShell` (`src/components/layout/AppShell.tsx`)
Discord-like three-column layout:
```
┌──────────┬────────────────┬─────────────────────────────────┐
│          │                │                                 │
│  Server  │    Channel     │         Main Content            │
│ Sidebar  │    Sidebar     │      (Post Feed / Admin)        │
│  (64px)  │    (240px)     │         (flex-grow)             │
│          │                │                                 │
└──────────┴────────────────┴─────────────────────────────────┘
```
- Responsive: collapses sidebars into drawers on mobile (<768px)
- Sticky positioning for sidebars (scroll independently)

##### `ServerSidebar` (`src/components/layout/ServerSidebar.tsx`)
- Vertical list of server icons/avatars (64px wide)
- Each server: round avatar with first letter or `iconUrl`
- Active server: highlighted with accent border
- Links to `/servers/:serverId`
- Tooltip on hover showing server name
- "+" button at bottom for admins (future: create server UI)

**API Integration:** `useServers()` query → `GET /api/servers`

##### `ChannelSidebar` (`src/components/layout/ChannelSidebar.tsx`)
- Shows when a server is selected (URL matches `/servers/:serverId/*`)
- Header: server name + member count
- Channels grouped by type:
  - 📢 **Announcements** (ANNOUNCEMENT channels)
  - 📚 **Courses** (COURSE channels, labeled with course code)
  - 💬 **General** (GENERAL channels)
  - 🎓 **Programs** (PROGRAM channels, labeled with program code)
- Each channel: link to `/servers/:serverId/channels/:channelId`
- Lock icon (🔒) for locked channels
- Archived channels hidden by default (toggle to show)
- Create button (context menu or "+" icon) for authorized users

**API Integration:** `useServerChannels(serverId)` → `GET /api/servers/:id/channels`

##### `TopBar` (`src/components/layout/TopBar.tsx`)
Horizontal bar above main content:
- Left: Breadcrumbs (Server Name > Channel Name with icons)
- Center: Channel description (if viewing a channel)
- Right:
  - Search bar (global search for posts by title)
  - Notification bell with unread count badge
  - User avatar dropdown

##### `NotificationBell` (`src/components/layout/NotificationBell.tsx`)
- Bell icon with red badge showing `unreadCount` from Zustand store
- Click → opens `NotificationPanel` dropdown
- Badge pulses on new urgent notification

**State:** Zustand `notification.store` updates via:
- Initial fetch: `GET /api/notifications/unread-count`
- Socket.IO: `notification:unread-count` event

##### `UserDropdown` (`src/components/layout/UserDropdown.tsx`)
Dropdown menu:
- User avatar + name + userType badge
- Menu items:
  - 👤 **Profile** → `/profile`
  - 🔔 **Notification Settings** → `/settings/notifications`
  - 🔑 **Change Password** → `/settings/password`
  - 🚪 **Logout** → calls `authApi.logout()`, clears store, redirects

##### `MobileDrawer` (`src/components/layout/MobileDrawer.tsx`)
- Hamburger menu button (visible only on `<768px`)
- Opens drawer from left with server sidebar contents
- Tap server → shows channel sidebar in same drawer
- Swipe right to close

##### `AdminLayout` (`src/components/layout/AdminLayout.tsx`)
Alternative layout for `/admin/*` routes:
- No ServerSidebar
- Replace ChannelSidebar with AdminNav (links to admin sections)
- Main content area shows admin pages

**AdminNav Items:**
- 📊 Dashboard
- 👥 Users
- 🏛️ Departments
- 📘 Programs
- 🧬 Disciplines
- 🎓 Classes
- 📚 Courses
- 🎭 Societies
- 🔐 Roles

#### Socket.IO Setup (in AppShell)
Connected after successful login, disconnected on logout.

**Event Listeners:**
```typescript
// In AppShell.tsx
useEffect(() => {
  if (!isAuthenticated) return;

  const socket = connectSocket();

  socket.on('notification:unread-count', ({ count }) => {
    notificationStore.setUnreadCount(count);
  });

  socket.on('notification:new', (notification) => {
    // Prepend to notification cache
    queryClient.setQueryData(['notifications'], (old) => {
      return { ...old, data: [notification, ...old.data] };
    });

    // Show toast for urgent notifications
    if (notification.post?.priority === 'URGENT') {
      toast.error(notification.title);
    }

    notificationStore.incrementUnread();
  });

  socket.on('auth:expired', () => {
    // Token expired, trigger logout
    authStore.clearUser();
    queryClient.clear();
    disconnectSocket();
    navigate('/login');
  });

  return () => {
    socket.off('notification:unread-count');
    socket.off('notification:new');
    socket.off('auth:expired');
  };
}, [isAuthenticated]);
```

#### Responsive Behavior
- **Desktop (≥1024px)**: All three columns visible
- **Tablet (768px - 1023px)**: ServerSidebar + ChannelSidebar collapsible, MainContent full width when collapsed
- **Mobile (<768px)**: Hamburger menu, sidebars in drawer

#### Verification
- ✅ Three-column layout renders correctly
- ✅ Server sidebar populates with user's servers
- ✅ Clicking server navigates and shows channel sidebar
- ✅ Channel sidebar groups channels by type
- ✅ Locked channels show lock icon
- ✅ Notification bell shows unread count
- ✅ User dropdown shows correct user info
- ✅ Mobile: sidebars collapse into drawer
- ✅ Socket.IO connects and receives `notification:unread-count` event

---

### Module 3: Server & Channel Views

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1, Module 2

#### Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/servers/:serverId` | `ServerPage` | Auto-redirects to first announcement channel |
| `/servers/:serverId/channels/:channelId` | `ChannelPage` | Post feed (Module 4) |
| `/servers/:serverId/members` | `MemberListPage` | Paginated member list with badges |

#### Components

##### `ServerPage` (`src/features/servers/pages/ServerPage.tsx`)
- Fetches server channels via `useServerChannels(serverId)`
- If no `channelId` in URL: navigate to first announcement channel
- Displays `ChannelSidebar` (handled by `AppShell`)

##### `ChannelPage` (`src/features/channels/pages/ChannelPage.tsx`)
- Displays `ChannelHeader` + `PostFeed` (Module 4)
- `channelId` from URL params

##### `ChannelHeader` (`src/features/channels/components/ChannelHeader.tsx`)
- Channel name + type badge (Announcement/Course/General/Program)
- Lock status indicator (🔒 Locked | 🔓 Unlocked)
- Description below name
- Right side: `ChannelActions` dropdown (for authorized users)

##### `ChannelActions` (`src/features/channels/components/ChannelActions.tsx`)
Dropdown menu (visible only to authorized users):
- **Edit** → opens `EditChannelDialog`
- **Lock** / **Unlock** → mutation to `PATCH /api/channels/:id/lock` or `/unlock`
- **Delete** → confirmation dialog, then `DELETE /api/channels/:id`

**Authorization Logic:**
- Show actions if:
  - User is `ADMIN`, OR
  - User has `create:channel` permission on this server (indicates management rights)
- Handle 403 gracefully: hide buttons, show toast if user somehow triggers action

##### `CreateChannelDialog` (`src/features/channels/components/CreateChannelDialog.tsx`)
Form fields:
- Name (required, max 100 chars)
- Description (optional, max 500 chars)
Submit → `POST /api/servers/:id/channels`
On success: invalidate `serverChannels` query, navigate to new channel

##### `EditChannelDialog` (`src/features/channels/components/EditChannelDialog.tsx`)
Same as create but pre-filled with existing channel data.
Submit → `PATCH /api/channels/:id`

##### `MemberListPage` (`src/features/servers/pages/MemberListPage.tsx`)
- Paginated list of server members
- Fetches via `useServerMembers(serverId, page)`
- Each member shows: `MemberCard`

##### `MemberCard` (`src/features/servers/components/MemberCard.tsx`)
- Avatar (64px, with `profilePictureUrl` or initials fallback)
- Full name (bold)
- Email (muted)
- User type badge (Admin/Teacher/Student)
- Role badges (HOD, CR, President, Moderator, etc.) - horizontally stacked

##### `RoleBadge` (`src/components/shared/RoleBadge.tsx`)
Colored pill with role name:
| Role | Color | Icon |
|------|-------|------|
| HOD | Purple | 👑 |
| Program Director | Indigo | 📚 |
| CR | Blue | 📝 |
| Society President | Green | ⭐ |
| Society Convenor | Teal | 🎭 |
| Moderator (Server) | Orange | 🛡️ |
| Moderator (Channel) | Amber | 🔧 |

#### API Integrations
```typescript
// src/api/endpoints/servers.api.ts
export const serversApi = {
  getServer: (id: number) =>
    axios.get<ServerDetail>(`/servers/${id}`),

  listChannels: (serverId: number, includeArchived = false) =>
    axios.get<Channel[]>(`/servers/${serverId}/channels`, {
      params: { includeArchived }
    }),

  listMembers: (serverId: number, page = 1, limit = 20) =>
    axios.get<PaginatedResponse<ServerMember>>(`/servers/${serverId}/members`, {
      params: { page, limit }
    }),

  createChannel: (serverId: number, data: CreateChannelDto) =>
    axios.post(`/servers/${serverId}/channels`, data),
};

// src/api/endpoints/channels.api.ts
export const channelsApi = {
  updateChannel: (channelId: number, data: UpdateChannelDto) =>
    axios.patch(`/channels/${channelId}`, data),

  lockChannel: (channelId: number) =>
    axios.patch(`/channels/${channelId}/lock`),

  unlockChannel: (channelId: number) =>
    axios.patch(`/channels/${channelId}/unlock`),

  deleteChannel: (channelId: number) =>
    axios.delete(`/channels/${channelId}`),
};
```

#### State Management
- **TanStack Query:**
  - `useServer(serverId)` - Server detail (cached 5min)
  - `useServerChannels(serverId)` - Channel list (cached 5min)
  - `useServerMembers(serverId, page)` - Paginated members (cached 5min)
  - Mutations: `useCreateChannel`, `useLockChannel`, `useDeleteChannel`
    - On success: invalidate `serverChannels` query

#### Permission Checks
```typescript
// src/hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuthStore();

  const canManageChannels = (serverId: number) => {
    if (user?.userType === 'ADMIN') return true;
    // TODO: Check if user has 'create:channel' permission on this server
    // For now, simplified: HOD/CR/Convenor/President can manage
    return user?.roles?.some(role =>
      ['hod', 'cr', 'president', 'convenor'].includes(role)
    );
  };

  return { canManageChannels };
}
```

#### Verification
- ✅ Navigate to server → auto-redirects to first announcement channel
- ✅ Channel sidebar shows channels grouped by type
- ✅ Locked channels show lock icon
- ✅ Click channel → URL updates, post feed loads (Module 4)
- ✅ Member list shows paginated members with role badges
- ✅ Admin/authorized users see channel management actions
- ✅ Create channel → dialog opens, submit creates channel, navigates to new channel
- ✅ Lock/unlock channel → mutation succeeds, UI updates
- ✅ Delete channel → confirmation dialog, deletion succeeds, navigates away

---

### Module 4: Posts & Announcements

**Estimated Effort:** 5-6 days (most complex module)
**Dependencies:** Module 0, Module 1, Module 2, Module 3

#### Routes
| Route | Component |
|-------|-----------|
| `/servers/:serverId/channels/:channelId` | `ChannelPage` (contains `PostFeed`) |

#### Components

##### `PostFeed` (`src/features/posts/components/PostFeed.tsx`)
- Hybrid paginated feed: paginated API with a load-more or infinite-style UI, while preserving deterministic pagination state
- Fetches via `usePosts(channelId, filters)`
- Displays pinned posts first (highlighted with pin icon), then chronological
- Empty state: "No posts yet. Be the first to post!"
- Loading skeleton while fetching

##### `PostCard` (`src/features/posts/components/PostCard.tsx`)
Compact card for list view:
- **Top row:** Author avatar + name + role badges + relative timestamp (e.g., "2 hours ago")
- **Title** (max 100 chars, bold, truncated with ellipsis if longer)
- **Content preview** (first 200 chars of HTML rendered as plain text, followed by "...")
- **Priority badge** (Normal=default, Important=amber, Urgent=red with pulse animation)
- **Pinned indicator** (📌 icon in top-right if `isPinned`)
- **Edited badge** (if `updatedAt !== null`, show "Edited" chip)
- **Attachment count** (📎 icon + count if `_count.attachments > 0`)
- **Bottom row:** `PostActions` dropdown (·· · icon)
- Click anywhere on card (except actions) → navigate to post detail or expand inline

##### `PostDetail` (`src/features/posts/components/PostDetail.tsx`)
Full post view (modal or inline):
- Full title
- Full content (rendered HTML, sanitized with DOMPurify)
- All attachments displayed as thumbnails (click to open lightbox)
- Author info with badges
- Pinned by: `{pinner.fullName}` (if pinned)
- Created / Updated timestamps
- `PostActions` dropdown

##### `CreatePostForm` (`src/features/posts/components/CreatePostForm.tsx`)
Form with:
- **Title** (Input, max 100 chars, character counter)
- **Content** (Tiptap editor, max 5000 chars, character counter)
- **Priority** (Select: Normal, Important, Urgent)
- **Attachments** (Drag-and-drop zone, max 3 files, 5MB each, JPEG/PNG/WEBP only)
- **Submit button** (disabled if validation fails)

**Validation:**
- Title: required, 1-100 chars
- Content: required, 1-5000 chars
- Attachments: max 3, each max 5MB, valid image types

**Submission:**
- Build `FormData`:
  ```javascript
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('content', contentHTML);
  formData.append('priority', data.priority);
  files.forEach(file => formData.append('attachments', file));
  ```
- `POST /api/channels/:id/posts` with `Content-Type: multipart/form-data`
- On success: invalidate `posts` query, scroll to top, show success toast

##### `EditPostForm` (`src/features/posts/components/EditPostForm.tsx`)
Same as `CreatePostForm` but:
- Pre-filled with existing post data
- **24-hour edit window:** Show countdown "Edit window expires in X hours"
- Only shown to post author within 24h of `createdAt`
- Cannot edit attachments (show existing attachments as read-only)
- Submit → `PATCH /api/posts/:id`

##### `PostSearchBar` (`src/features/posts/components/PostSearchBar.tsx`)
- Search input with 🔍 icon
- 500ms debounce before triggering API call
- Updates URL search params `?search=...`
- Clears search → removes param

##### `PostFilters` (`src/features/posts/components/PostFilters.tsx`)
- **Priority filter** (Multi-select: Normal, Important, Urgent)
- **Date range** (DatePicker: startDate, endDate)
- **"Clear Filters" button**
- Updates URL search params `?priority=URGENT&startDate=...&endDate=...`

##### `PriorityBadge` (`src/features/posts/components/PriorityBadge.tsx`)
| Priority | Style |
|----------|-------|
| NORMAL | Gray background, no special styling |
| IMPORTANT | Amber background, ⚠️ icon |
| URGENT | Red background, 🚨 icon, pulse animation |

##### `AttachmentPreview` (`src/features/posts/components/AttachmentPreview.tsx`)
- Thumbnail grid (3 columns)
- Each image: small thumbnail (150x150 object-cover)
- Click → opens lightbox modal with full-size image
- Navigation arrows if multiple attachments

##### `PostActions` (`src/features/posts/components/PostActions.tsx`)
Dropdown menu (·· · icon):
- **Edit** (shown if: author + within 24h of creation)
- **Delete** (shown if: author OR admin)
- **Pin** / **Unpin** (shown if: user has `lock:channel` permission)
- Each action: confirmation dialog before mutation

#### Tiptap Configuration
```typescript
// src/features/posts/lib/tiptap-config.ts
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

export function useTiptapEditor(initialContent = '', maxChars = 5000) {
  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: true,
        bulletList: true,
        orderedList: true,
      }),
      Placeholder.configure({
        placeholder: 'Write your announcement here...',
      }),
      CharacterCount.configure({
        limit: maxChars,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });
}
```

**Toolbar:**
- Bold, Italic, Strike
- H1, H2, H3
- Bullet List, Ordered List
- Code Block
- Undo, Redo
- Character count: `{editor.storage.characterCount.characters()} / 5000`

#### API Integrations
```typescript
// src/api/endpoints/posts.api.ts
export const postsApi = {
  listPosts: (channelId: number, params: PostListParams) =>
    axios.get<PaginatedResponse<PostListItem>>(`/channels/${channelId}/posts`, { params }),

  getPost: (postId: number) =>
    axios.get<PostDetail>(`/posts/${postId}`),

  createPost: (channelId: number, formData: FormData) =>
    axios.post(`/channels/${channelId}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updatePost: (postId: number, data: UpdatePostDto) =>
    axios.patch(`/posts/${postId}`, data),

  deletePost: (postId: number) =>
    axios.delete(`/posts/${postId}`),

  pinPost: (postId: number, isPinned: boolean) =>
    axios.patch(`/posts/${postId}/pin`, { isPinned }),
};
```

#### State Management
- **TanStack Query:**
  - `usePosts(channelId, filters)` - Paginated posts with search/filter
    - Query key: `['posts', channelId, filters]` (filters trigger re-fetch)
  - `usePost(postId)` - Single post detail
  - Mutations: `useCreatePost`, `useUpdatePost`, `useDeletePost`, `usePinPost`
    - On success: invalidate `['posts', channelId]` query

- **Filter State:**
  - Managed via URL search params (React Router `useSearchParams`)
  - `?search=test&priority=URGENT&startDate=2026-03-01&endDate=2026-03-07`
  - Preserves filters on navigation

#### Edit Window Logic
```typescript
// src/features/posts/hooks/useCanEditPost.ts
export function useCanEditPost(post: PostListItem | PostDetail) {
  const { user } = useAuthStore();

  const isAuthor = user?.id === post.author.id;
  const createdAt = new Date(post.createdAt);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const within24Hours = hoursSinceCreation < 24;

  return isAuthor && within24Hours;
}
```

#### Verification
- ✅ Post feed loads with pinned posts first
- ✅ Post card shows all info (author, badges, priority, edited indicator)
- ✅ Click post → opens detail view
- ✅ Create post form: title + Tiptap content + priority + attachments
- ✅ Create post → mutation succeeds, new post appears in feed
- ✅ Edit post (within 24h, as author) → form pre-filled, submission updates post
- ✅ Edit post (after 24h) → edit button not shown
- ✅ Delete post → confirmation dialog, deletion succeeds, post removed from feed
- ✅ Pin post (as authorized user) → post moves to top, pin icon shown
- ✅ Search by title → filters posts correctly
- ✅ Filter by priority → shows only matching posts
- ✅ Filter by date range → shows posts in range
- ✅ Upload attachments → thumbnails displayed, click opens lightbox

---

### Module 5: Notifications

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1, Module 2, Module 3

#### Routes
| Route | Component |
|-------|-----------|
| (dropdown from bell) | `NotificationPanel` |
| `/settings/notifications` | `NotificationPreferencesPage` |

#### Components

##### `NotificationBell` (already in Module 2, enhanced here)
- Bell icon (`<Bell />` from lucide-react)
- Red badge with `unreadCount` (positioned top-right)
- Badge pulse animation on new notification
- Click → toggles `NotificationPanel` dropdown

##### `NotificationPanel` (`src/features/notifications/components/NotificationPanel.tsx`)
Dropdown panel (positioned below bell):
- Header: "Notifications" title + "Mark all as read" button
- Scrollable list (max-height: 400px)
- Each notification: `NotificationItem`
- Empty state: "No notifications yet"
- Footer: "View all" link to `/settings/notifications` (future: dedicated notifications page)

##### `NotificationItem` (`src/features/notifications/components/NotificationItem.tsx`)
- **Unread:** Bold title, blue dot indicator on left
- **Read:** Normal weight, no dot
- **Layout:**
  - Icon based on type (📢 NEW_POST, 🔐 ROLE_ASSIGNED)
  - Title (bold if unread)
  - Message (1-line summary)
  - Relative timestamp ("5 minutes ago")
- **Click behavior:**
  - Mark notification as read (`PATCH /api/notifications/:id/read`)
  - Navigate to associated post:
    - `NEW_POST`: navigate to `/servers/{serverId}/channels/{channelId}` (from `notification.post.channel`)
    - `ROLE_ASSIGNED`: navigate to `/profile` (to see new role)

##### `NotificationPreferencesPage` (`src/features/notifications/pages/NotificationPreferencesPage.tsx`)
- List of user's servers (fetched via `useServers()`)
- Each server: toggle switch (subscribe/unsubscribe at server level)
- Expand server → shows channels with individual toggle switches
- **Subscription logic:**
  - Server-level unsubscribe: suppresses all notifications from that server's channels
  - Channel-level unsubscribe: suppresses only that channel's notifications
- Submission: `PATCH /api/notification-preferences` on toggle (optimistic update)

##### `SubscriptionToggle` (`src/features/notifications/components/SubscriptionToggle.tsx`)
- Switch component from shadcn/ui
- `checked={isSubscribed}`
- `onCheckedChange` → mutation to update preference
- Optimistic update: toggle immediately, rollback on error

#### Socket.IO Integration (in AppShell from Module 2, detailed here)
```typescript
// In AppShell.tsx (Module 2)
socket.on('notification:new', (notification: Notification) => {
  // 1. Prepend to notifications cache
  queryClient.setQueryData(['notifications'], (old: any) => {
    if (!old) return { data: [notification], pagination: { total: 1 } };
    return {
      ...old,
      data: [notification, ...old.data],
      pagination: { ...old.pagination, total: old.pagination.total + 1 },
    };
  });

  // 2. Increment unread count
  notificationStore.incrementUnread();

  // 3. Show toast for urgent posts
  const isUrgent = notification.post?.priority === 'URGENT';
  if (isUrgent) {
    toast.error(notification.title, {
      description: notification.message,
      action: {
        label: 'View',
        onClick: () => navigate(`/servers/${notification.post.channel.serverId}/channels/${notification.post.channelId}`),
      },
    });
  }
});

socket.on('notification:unread-count', ({ count }: { count: number }) => {
  notificationStore.setUnreadCount(count);
});
```

#### API Integrations
```typescript
// src/api/endpoints/notifications.api.ts
export const notificationsApi = {
  listNotifications: (params: NotificationListParams) =>
    axios.get<PaginatedResponse<Notification>>('/notifications', { params }),

  getUnreadCount: () =>
    axios.get<{ count: number }>('/notifications/unread-count'),

  markAsRead: (notificationId: number) =>
    axios.patch(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    axios.patch('/notifications/read-all'),

  listPreferences: () =>
    axios.get<NotificationPreference[]>('/notification-preferences'),

  updatePreference: (data: UpdatePreferenceDto) =>
    axios.patch('/notification-preferences', data),
};
```

#### State Management
- **Zustand Notification Store:**
  - `unreadCount` - Updated by:
    1. Initial fetch on mount: `GET /api/notifications/unread-count`
    2. Socket.IO `notification:unread-count` event
    3. Optimistic decrement on `markAsRead` / `markAllAsRead`

- **TanStack Query:**
  - `useNotifications(filters)` - Paginated notification list
  - `useNotificationPreferences()` - User's subscription preferences
  - Mutations:
    - `useMarkAsRead` - Optimistic update: set `readAt`, decrement unread count
    - `useMarkAllAsRead` - Optimistic update: set all `readAt`, reset unread count to 0
    - `useUpdatePreference` - Optimistic toggle

#### Navigation Logic
```typescript
// src/features/notifications/utils/handleNotificationClick.ts
export function handleNotificationClick(notification: Notification, navigate: NavigateFunction) {
  // Mark as read
  notificationsApi.markAsRead(notification.id);

  // Navigate based on type
  if (notification.type === 'NEW_POST' && notification.post) {
    const { serverId, channelId } = notification.post.channel;
    navigate(`/servers/${serverId}/channels/${channelId}`);
  } else if (notification.type === 'ROLE_ASSIGNED') {
    navigate('/profile');
  }
}
```

#### Verification
- ✅ Notification bell shows correct unread count on mount
- ✅ Socket.IO receives `notification:new` event, count increments, toast shown for urgent
- ✅ Click bell → dropdown opens with notification list
- ✅ Unread notifications are bold with blue dot
- ✅ Click notification → marks as read, navigates to post's channel
- ✅ "Mark all as read" → all notifications marked, count resets to 0
- ✅ Notification preferences page shows servers with toggles
- ✅ Toggle server subscription → mutation succeeds, UI updates
- ✅ Expand server → shows channels, toggle channel subscription works

---

### Module 6: User Profile & Management

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1, Module 2

#### Routes
| Route | Component |
|-------|-----------|
| `/profile` | `ProfilePage` |
| `/admin/users` | `AdminUserListPage` |
| `/admin/users/new` | `CreateUserPage` |
| `/admin/users/import` | `BulkImportPage` |

#### Components

##### `ProfilePage` (`src/features/profile/pages/ProfilePage.tsx`)
- Fetches via `useProfile()` → `GET /api/users/me`
- Layout:
  - Top: large avatar (128px) with upload button overlay (camera icon on hover)
  - Below avatar: full name (h1)
  - User type badge (Admin/Teacher/Student)
  - Role badges (horizontal stack)
- **Editable fields:**
  - Bio (inline edit, max 500 chars, textarea)
- **Read-only display:**
  - Email, phone, gender, department, creation date
  - Student-specific: Roll number, class, program
  - Teacher-specific: Designation

##### `ProfilePictureUpload` (`src/features/profile/components/ProfilePictureUpload.tsx`)
- Click avatar → file picker
- Preview in modal before upload
- Validation: image only, max 5MB
- Submit → `PATCH /api/users/me/profile-picture` (multipart/form-data)
- On success: invalidate `profile` query, avatar updates

##### `BioEditor` (`src/features/profile/components/BioEditor.tsx`)
- Initially displays bio as read-only text
- Click "Edit" button → textarea appears (max 500 chars, character counter)
- "Save" / "Cancel" buttons
- Submit → `PATCH /api/users/me` with `{ bio }`
- On success: invalidate `profile` query

##### `AdminUserListPage` (`src/features/admin/pages/AdminUserListPage.tsx`)
- Data table with filters:
  - **User Type** (dropdown: All, Admin, Teacher, Student)
  - **Department** (dropdown: All, CS, SE, AI, etc.)
  - **Status** (dropdown: All, Active, Inactive)
  - **Search** (input: search by name/email)
- Columns:
  - Avatar + Name
  - Email
  - User Type
  - Department
  - Status (Active/Inactive badge)
  - Actions (dropdown: View, Deactivate/Reactivate)
- Paginated (20 per page)

##### `CreateUserPage` (`src/features/admin/pages/CreateUserPage.tsx`)
- Form with `React Hook Form + Zod`
- **Base fields** (all users):
  - Full name, email, phone, gender (radio: Male/Female)
  - User type (select: Admin, Teacher, Student)
- **Conditional fields** (based on user type):
  - **Student:** Department, Class, Roll Number
  - **Teacher:** Department, Designation
  - **Admin:** No additional fields
- **Password handling:**
  - Backend auto-generates temp password `TEMP_{randomString}`
  - User must change on first login
- Submit → `POST /api/users`
- On success: show success toast with temp password (for manual distribution), redirect to user list

##### `BulkImportPage` (`src/features/admin/pages/BulkImportPage.tsx`)
- CSV file upload component
- **CSV format:**
  - Headers: `fullName,email,phone,gender,userType,departmentId,classId,rollNumber,designation`
  - Example row: `John Doe,john@ntu.edu.pk,03001234567,MALE,STUDENT,1,1,2021-CS-001,`
- Drag-and-drop zone or "Choose file" button
- Upload → `POST /api/users/bulk-import` (multipart/form-data)
- **Progress indicator** during upload
- **Result summary:**
  - Total rows processed
  - Successful imports
  - Failed imports (with row numbers and error messages)
- Download failed rows as CSV for correction

##### `UserDetailDialog` (`src/features/admin/components/UserDetailDialog.tsx`)
- Modal showing full user info
- Same layout as `ProfilePage` but read-only
- Footer: "Deactivate" / "Reactivate" button (based on current status)

#### API Integrations
```typescript
// src/api/endpoints/users.api.ts
export const usersApi = {
  getProfile: () =>
    axios.get<UserProfile>('/users/me'),

  updateProfile: (data: UpdateProfileDto) =>
    axios.patch('/users/me', data),

  updateProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return axios.patch('/users/me/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  createUser: (data: CreateUserDto) =>
    axios.post('/users', data),

  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/users/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        // Update progress bar
      },
    });
  },

  listUsers: (params: UserListParams) =>
    axios.get<PaginatedResponse<UserListItem>>('/users', { params }),

  getUser: (id: number) =>
    axios.get<UserProfile>(`/users/${id}`),

  deactivateUser: (id: number) =>
    axios.patch(`/users/${id}/deactivate`),

  reactivateUser: (id: number) =>
    axios.patch(`/users/${id}/reactivate`),
};
```

#### Zod Schemas
```typescript
// src/features/admin/schemas/user.schemas.ts
const baseUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^03\d{9}$/, "Invalid phone number (03XXXXXXXXX)"),
  gender: z.enum(["MALE", "FEMALE"]),
  userType: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
});

export const createUserSchema = baseUserSchema.and(
  z.discriminatedUnion("userType", [
    z.object({
      userType: z.literal("ADMIN"),
    }),
    z.object({
      userType: z.literal("TEACHER"),
      departmentId: z.number().int().positive(),
      designation: z.string().min(1).max(100),
    }),
    z.object({
      userType: z.literal("STUDENT"),
      departmentId: z.number().int().positive(),
      classId: z.number().int().positive(),
      rollNumber: z.string().regex(/^\d{4}-[A-Z]{2,4}-\d{3}$/),
    }),
  ])
);

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
});
```

#### Verification
- ✅ Profile page loads with user data
- ✅ Click avatar → file picker opens, upload succeeds, avatar updates
- ✅ Edit bio → textarea appears, save succeeds, bio updates
- ✅ Admin user list loads with filters
- ✅ Filter by user type → table updates
- ✅ Search by name/email → table updates
- ✅ Create user form: conditional fields render based on user type
- ✅ Create user → success, temp password shown, user appears in list
- ✅ Bulk import CSV → upload progress shown, result summary displays
- ✅ Deactivate user → confirmation, mutation succeeds, status updates to inactive
- ✅ Reactivate user → mutation succeeds, status updates to active

---

### Module 7: Admin Dashboard & CRUD

**Estimated Effort:** 5-6 days
**Dependencies:** Module 0, Module 1, Module 2, Module 6

#### Routes
| Route | Component |
|-------|-----------|
| `/admin/dashboard` | `AdminDashboardPage` |
| `/admin/departments` | `DepartmentListPage` |
| `/admin/departments/:id` | `DepartmentDetailPage` |
| `/admin/departments/:id/programs` | `ProgramListPage` (nested) |
| `/admin/programs/:id/curriculum` | `CurriculumPage` |
| `/admin/disciplines` | `DisciplineListPage` |
| `/admin/classes` | `ClassListPage` |
| `/admin/classes/:id` | `ClassDetailPage` |
| `/admin/courses` | `CourseListPage` |

#### Components

##### `AdminDashboardPage` (`src/features/admin/pages/AdminDashboardPage.tsx`)
- Fetches via `useAdminStats()` → `GET /api/admin/stats`
- Grid of stat cards (4 columns on desktop, 2 on tablet, 1 on mobile):
  1. **Total Users** - Count + breakdown: Admin / Teacher / Student
  2. **Active Users** - Count (isActive === true)
  3. **Total Servers** - Count + breakdown: Department / Class / Society
  4. **Total Posts** - Count
- Each card:
  - Icon (from lucide-react)
  - Main number (large, bold)
  - Label
  - Sub-stats (if applicable)

##### `DepartmentListPage` (`src/features/admin/pages/DepartmentListPage.tsx`)
- Table with columns: Name, Code, HOD, Server, Actions
- "Create Department" button → opens `CreateDepartmentDialog`
- Click row → navigate to `/admin/departments/:id`

##### `CreateDepartmentDialog` (`src/features/admin/components/CreateDepartmentDialog.tsx`)
- Form fields: Name, Code
- Submit → `POST /api/departments`
- On success: invalidate `departments` query, close dialog

##### `DepartmentDetailPage` (`src/features/admin/pages/DepartmentDetailPage.tsx`)
- Tabs:
  1. **Overview** - Department info, edit form, stats (fetched from `GET /api/departments/:id/stats`)
  2. **Programs** - List of programs in this department (inline `ProgramListPage`)
- Edit form: Name, Code, HOD (dropdown of teachers in this department)
- Submit → `PATCH /api/departments/:id`

##### `ProgramListPage` (`src/features/admin/components/ProgramListPage.tsx`)
- Table with columns: Code, Discipline, Degree Level, Semesters, Program Director, Actions
- "Create Program" button → opens `CreateProgramDialog`
- Click row → navigate to `/admin/programs/:id/curriculum`

##### `CreateProgramDialog` (`src/features/admin/components/CreateProgramDialog.tsx`)
- Form fields:
  - Discipline (dropdown from `GET /api/disciplines`)
  - Degree Level (dropdown: Bachelor, Master, PhD)
  - Semesters (number input, 1-10)
  - Code (auto-generated suggestion based on discipline + degree, editable)
  - Program Director (dropdown of teachers in this department)
- Submit → `POST /api/departments/:id/programs`

##### `CurriculumPage` (`src/features/admin/pages/CurriculumPage.tsx`)
- Fetches via `useCurriculum(programId)` → `GET /api/programs/:id/curriculum`
- Grouped by semester (accordion or tabs)
- Each semester: table of courses with columns: Course Code, Title, Credit Hours, Batch Year, Remove Button
- "Add Course" button → `AddCurriculumDialog`

##### `AddCurriculumDialog` (`src/features/admin/components/AddCurriculumDialog.tsx`)
- Form fields:
  - Course (searchable dropdown from `GET /api/courses`)
  - Semester Number (dropdown 1-10)
  - Batch Year (number input, e.g., 2024)
- Submit → `POST /api/programs/:id/curriculum`

##### `DisciplineListPage` (`src/features/admin/pages/DisciplineListPage.tsx`)
- Simple list of disciplines (Chip tags or cards)
- "Create Discipline" button → opens `CreateDisciplineDialog`

##### `CreateDisciplineDialog` (`src/features/admin/components/CreateDisciplineDialog.tsx`)
- Single field: Name
- Submit → `POST /api/disciplines`

##### `ClassListPage` (`src/features/admin/pages/ClassListPage.tsx`)
- Table with columns: Program, Section, Current Semester, Academic Year, CR, Server, Actions
- Filters: Program (dropdown), Section (A/B)
- "Create Class" button → `CreateClassDialog`
- Click row → navigate to `/admin/classes/:id`

##### `CreateClassDialog` (`src/features/admin/components/CreateClassDialog.tsx`)
- Form fields:
  - Program (dropdown)
  - Section (radio: A / B)
  - Current Semester (number 1-10)
  - Academic Year (number, e.g., 2024)
  - Admission Year (number, e.g., 2021)
  - CR (searchable dropdown of students in this program, optional)
- Submit → `POST /api/classes`

##### `ClassDetailPage` (`src/features/admin/pages/ClassDetailPage.tsx`)
- Tabs:
  1. **Overview** - Class info (read-only)
  2. **Courses** - Assigned courses with teacher info, assign/remove actions
  3. **Semester Progression** - Button to advance semester

**Courses Tab:**
- Table: Course Code, Title, Teacher, Actions (Remove)
- "Assign Course" button → `AssignCourseDialog`

##### `AssignCourseDialog` (`src/features/admin/components/AssignCourseDialog.tsx`)
- Form fields:
  - Course (dropdown from curriculum for this program's current semester)
  - Teacher (dropdown of teachers in this department)
- Submit → `POST /api/classes/:id/courses`

##### `SemesterProgressionButton` (`src/features/admin/components/SemesterProgressionButton.tsx`)
- Big red button: "Advance to Next Semester"
- Click → opens confirmation dialog with explanation:
  - "This will increment the current semester by 1."
  - "All course channels will be archived."
  - "All teacher-course assignments (TEACHES) will be cleared."
  - "This action cannot be undone."
- Confirm → `POST /api/classes/:id/semester-progression`
- On success: invalidate class query, show success toast, refresh page

##### `CourseListPage` (`src/features/admin/pages/CourseListPage.tsx`)
- Table: Code, Title, Credit Hours, Department, Actions
- "Create Course" button → `CreateCourseDialog`
- Click row → `EditCourseDialog`

##### `CreateCourseDialog` / `EditCourseDialog` (`src/features/admin/components/`)
- Form fields: Title, Code, Credit Hours (number 1-6), Department (dropdown)
- Submit → `POST /api/courses` or `PATCH /api/courses/:id`

#### API Integrations
```typescript
// src/api/endpoints/admin.api.ts
export const adminApi = {
  getStats: () =>
    axios.get<AdminStats>('/admin/stats'),

  listAllUsers: (params: AdminUserListParams) =>
    axios.get<PaginatedResponse<UserListItem>>('/admin/users', { params }),
};

// src/api/endpoints/departments.api.ts
export const departmentsApi = {
  list: () => axios.get<Department[]>('/departments'),
  get: (id: number) => axios.get<DepartmentDetail>(`/departments/${id}`),
  getStats: (id: number) => axios.get<DepartmentStats>(`/departments/${id}/stats`),
  create: (data: CreateDepartmentDto) => axios.post('/departments', data),
  update: (id: number, data: UpdateDepartmentDto) => axios.patch(`/departments/${id}`, data),
  listPrograms: (id: number) => axios.get<Program[]>(`/departments/${id}/programs`),
  createProgram: (id: number, data: CreateProgramDto) => axios.post(`/departments/${id}/programs`, data),
};

// Similar patterns for programs.api.ts, disciplines.api.ts, classes.api.ts, courses.api.ts
```

#### Verification
- ✅ Admin dashboard shows correct stats
- ✅ Department list loads, create dialog works, new department appears
- ✅ Department detail shows info and stats
- ✅ Programs list shows programs for department
- ✅ Create program → dialog opens, submission succeeds
- ✅ Curriculum page groups courses by semester
- ✅ Add curriculum entry → course added to semester
- ✅ Remove curriculum entry → course removed
- ✅ Discipline list loads, create discipline works
- ✅ Class list loads with filters
- ✅ Create class → class created with server
- ✅ Class detail shows assigned courses
- ✅ Assign course → teacher assigned to course for this class
- ✅ Remove course assignment → teacher removed
- ✅ Semester progression → confirmation dialog, progression succeeds, semester incremented, channels archived
- ✅ Course list loads, create/edit course works

---

### Module 8: Society Management

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1, Module 2, Module 3

#### Routes
| Route | Component |
|-------|-----------|
| `/admin/societies` | `SocietyListPage` |
| `/admin/societies/:id` | `SocietyDetailPage` |

#### Components

##### `SocietyListPage` (`src/features/societies/pages/SocietyListPage.tsx`)
- Card grid or table layout
- Each society card:
  - Society name
  - Department
  - President name
  - Convenor name
  - Member count
  - Active status badge
- Filter: Department (dropdown)
- "Create Society" button (only for HOD/Admin)

##### `CreateSocietyDialog` (`src/features/societies/components/CreateSocietyDialog.tsx`)
- Form fields:
  - Name, Description (textarea)
  - Department (dropdown)
  - President (searchable dropdown of students in this department)
  - Convenor (searchable dropdown of teachers in this department)
- Submit → `POST /api/societies`

##### `SocietyDetailPage` (`src/features/societies/pages/SocietyDetailPage.tsx`)
- Tabs:
  1. **Overview** - Society info, edit button (for convenor/president/admin)
  2. **Members** - Member list with "Add Member" and remove buttons
  3. **Join Requests** - Pending requests with approve/reject buttons

**Members Tab:**
- `SocietyMemberList` component
- Paginated list of members (avatar, name, email, join date)
- "Remove" button for each member (convenor/president/admin only)
- "Add Member" button → `AddMemberDialog`

**Join Requests Tab:**
- `JoinRequestList` component
- List of pending requests (avatar, name, email, requested date)
- Actions: Approve (green button), Reject (red button)
- Empty state: "No pending requests"

##### `JoinRequestButton` (`src/features/societies/components/JoinRequestButton.tsx`)
- Shown to students viewing a society they're not a member of
- Button: "Request to Join"
- Click → `POST /api/societies/:id/join-request`
- On success: button changes to "Request Sent" (disabled)

##### `AddMemberDialog` (`src/features/societies/components/AddMemberDialog.tsx`)
- Searchable dropdown to find students by name/email
- Submit → `POST /api/societies/:id/members`

#### API Integrations
```typescript
// src/api/endpoints/societies.api.ts
export const societiesApi = {
  list: (params?: SocietyListParams) =>
    axios.get<Society[]>('/societies', { params }),

  get: (id: number) =>
    axios.get<SocietyDetail>('/societies/${id}'),

  create: (data: CreateSocietyDto) =>
    axios.post('/societies', data),

  update: (id: number, data: UpdateSocietyDto) =>
    axios.patch(`/societies/${id}`, data),

  submitJoinRequest: (societyId: number) =>
    axios.post(`/societies/${societyId}/join-request`),

  listJoinRequests: (societyId: number) =>
    axios.get<JoinRequest[]>(`/societies/${societyId}/join-requests`),

  reviewJoinRequest: (societyId: number, requestId: number, status: 'APPROVED' | 'REJECTED') =>
    axios.patch(`/societies/${societyId}/join-requests/${requestId}`, { status }),

  addMember: (societyId: number, userId: number) =>
    axios.post(`/societies/${societyId}/members`, { userId }),

  removeMember: (societyId: number, userId: number) =>
    axios.delete(`/societies/${societyId}/members/${userId}`),

  listMembers: (societyId: number, page?: number) =>
    axios.get<PaginatedResponse<SocietyMember>>(`/societies/${societyId}/members`, { params: { page } }),
};
```

#### Permission Checks
- **Create society:** Only HOD or Admin
- **Edit society:** Only convenor, president, or admin
- **Approve/reject join requests:** Only convenor or president
- **Add/remove members:** Only convenor or president

#### Verification
- ✅ Society list loads with cards
- ✅ Filter by department works
- ✅ Create society (as HOD/admin) → dialog opens, submission succeeds
- ✅ Society detail shows info, members, join requests tabs
- ✅ Join request (as student) → request sent, appears in pending list
- ✅ Approve join request (as convenor) → member added, request removed
- ✅ Reject join request → request removed
- ✅ Add member directly → member added to list
- ✅ Remove member → member removed from list

---

### Module 9: Role Management

**Estimated Effort:** 3-4 days
**Dependencies:** Module 0, Module 1, Module 2, Module 7, Module 8

#### Routes
| Route | Component |
|-------|-----------|
| `/admin/roles` | `RoleManagementPage` |

#### Components

##### `RoleManagementPage` (`src/features/roles/pages/RoleManagementPage.tsx`)
- Two-column layout:
  - **Left:** User search/picker
  - **Right:** Role assignment/revocation interface (shown after selecting a user)

**User Search:**
- Searchable dropdown (name/email)
- On select → fetch user's current roles via `GET /api/roles/users/:id`

**Current Roles Display:**
- `UserRolesView` component
- List of roles with scope context:
  - "HOD of Computer Science Department"
  - "CR of CS-7A"
  - "Program Director of BS Computer Science"
  - "Society President of Debating Society"
  - "Moderator of #announcements in CS Department Server"
- Each role: badge + "Revoke" button

##### `AssignRoleForm` (`src/features/roles/components/AssignRoleForm.tsx`)
Dynamic form that adapts based on selected role type:

**Step 1:** Select role type (dropdown)
- HOD
- Program Director
- CR (Class Representative)
- Society President
- Society Convenor
- Moderator

**Step 2:** Select scope (dropdown based on role)
- **HOD:** Select Department
- **Program Director:** Select Program
- **CR:** Select Class
- **Society President:** Select Society
- **Society Convenor:** Select Society
- **Moderator:** Select Server (+ optional Channel for channel-scoped moderator)

**Step 3:** Submit
- `POST /api/roles/assign` with payload:
  ```typescript
  // Non-moderator roles
  { userId: number, role: string, scopeId: number }

  // Moderator role
  { userId: number, role: "moderator", serverId: number, channelId?: number }
  ```

##### `RevokeRoleButton` (`src/features/roles/components/RevokeRoleButton.tsx`)
- Confirmation dialog: "Are you sure you want to revoke {roleName} from {userName}?"
- Confirm → `POST /api/roles/revoke` with same payload shape as assign
- **Note:** Society President and Convenor roles cannot be revoked directly (must change via `PATCH /api/societies/:id`)

##### `RoleScopePicker` (`src/features/roles/components/RoleScopePicker.tsx`)
Dropdown that loads entities based on role type:
- **Department:** `GET /api/departments`
- **Program:** `GET /api/departments/:id/programs` (nested, department selected first)
- **Class:** `GET /api/classes`
- **Society:** `GET /api/societies`
- **Server:** `GET /api/servers` (for moderator)
- **Channel:** `GET /api/servers/:id/channels` (for channel-scoped moderator)

#### API Integrations
```typescript
// src/api/endpoints/roles.api.ts
export const rolesApi = {
  getUserRoles: (userId: number) =>
    axios.get<UserRole[]>(`/roles/users/${userId}`),

  assignRole: (data: AssignRoleDto) =>
    axios.post('/roles/assign', data),

  revokeRole: (data: RevokeRoleDto) =>
    axios.post('/roles/revoke', data),
};
```

#### Permission-Aware UI (Cross-Cutting)
Implemented across ALL modules to conditionally show/hide management actions.

**Hook:** `usePermissions()` (`src/hooks/usePermissions.ts`)
```typescript
export function usePermissions() {
  const { user } = useAuthStore();

  // Admin bypass: admins see everything
  if (user?.userType === 'ADMIN') {
    return {
      canManageChannels: () => true,
      canManageUsers: () => true,
      canManageSocieties: () => true,
      canAssignRoles: () => true,
      canPinPosts: () => true,
    };
  }

  // Check user's roles for specific permissions
  const roles = user?.roles || [];

  return {
    canManageChannels: (serverId: number) => {
      // Check if user is HOD, CR, President, or Convenor for this server
      // Simplified: return true if roles includes any of these
      return roles.some(r => ['hod', 'cr', 'president', 'convenor'].includes(r));
    },

    canPinPosts: (channelId: number) => {
      // Check if user has lock:channel permission (HOD, CR, Moderator)
      return roles.some(r => ['hod', 'cr', 'moderator'].includes(r));
    },

    // ... other permission checks
  };
}
```

**Component:** `<Can>` (`src/components/shared/Can.tsx`)
```typescript
export function Can({ action, serverId, children }: CanProps) {
  const permissions = usePermissions();

  const allowed = permissions[action]?.(serverId);

  return allowed ? <>{children}</> : null;
}

// Usage:
<Can action="canManageChannels" serverId={serverId}>
  <Button>Create Channel</Button>
</Can>
```

#### Verification
- ✅ Role management page loads
- ✅ Search for user → user roles displayed with scope context
- ✅ Assign role: select role type, select scope, submission succeeds, role appears in list
- ✅ Revoke role → confirmation dialog, revocation succeeds, role removed
- ✅ Permission-aware UI: non-admin users only see actions they're authorized for
- ✅ Admin users see all actions
- ✅ HOD sees management actions for their department's servers
- ✅ CR sees management actions for their class server
- ✅ Moderator sees management actions for assigned server/channel

---

## Build Order & Timeline

### Phase 1: Foundation (Week 1)
**Module 0: Project Foundation**
- Day 1-2: Vite setup, Tailwind, shadcn/ui, folder structure
- Day 3: Axios instance, TanStack Query, Zustand stores
- Day 4: Socket.IO client, type definitions
- Day 5: Route tree, guards, error boundary, toast system

### Phase 2: Core Shell (Week 2)
**Module 1: Authentication**
- Day 1: Login page and form
- Day 2: Password reset flow
- Day 3: Change password (forced and voluntary)

**Module 2: Layout & Navigation**
- Day 4-5: AppShell, ServerSidebar, ChannelSidebar, TopBar
- Day 6: Responsive design, mobile drawer
- Day 7: Socket.IO integration, notification bell

### Phase 3: Primary User Experience (Weeks 3-4)
**Module 3: Server & Channel Views**
- Day 1-2: Server page, channel list, member list
- Day 3: Create/edit/lock/delete channel

**Module 4: Posts & Announcements**
- Day 4-5: Post feed, post card, post detail
- Day 6-7: Tiptap editor, create post form
- Day 8: Edit/delete/pin posts
- Day 9: Search and filters
- Day 10: Attachment upload and preview

**Module 5: Notifications**
- Day 11-12: Notification panel, real-time updates
- Day 13: Notification preferences page

### Phase 4: Profile & Admin (Weeks 5-6)
**Module 6: User Profile & Management**
- Day 1-2: Profile page, bio editor, profile picture upload
- Day 3: Admin user list with filters
- Day 4: Create user form
- Day 5: Bulk CSV import

**Module 7: Admin Dashboard & CRUD**
- Day 6: Admin dashboard with stats
- Day 7-8: Department CRUD
- Day 9: Program CRUD, curriculum management
- Day 10: Discipline CRUD
- Day 11-12: Class CRUD, course assignment, semester progression
- Day 13: Course CRUD

### Phase 5: Extended Features (Week 7)
**Module 8: Society Management**
- Day 1-2: Society list, society detail
- Day 3: Join requests, member management

**Module 9: Role Management**
- Day 4-5: Role assignment/revocation UI
- Day 6: Permission-aware UI across all modules
- Day 7: Testing and refinement

---

## Verification Criteria

### Module 0
✅ `npm run dev` starts without errors
✅ Vite proxy connects to backend
✅ Test API call `GET /api/health` returns `{ success: true }`
✅ TypeScript type checking passes
✅ Tailwind CSS classes render

### Module 1
✅ Login with valid credentials → redirects to server list
✅ Login with invalid credentials → shows inline error
✅ Login with temp password → forced to change password
✅ Forced-password user cannot navigate to protected routes before updating password
✅ Forgot password → silent success confirmation shown
✅ Reset password with valid token → redirects to login
✅ Reset password with invalid token → shows error
✅ Logout → protected routes redirect back to login
✅ 401 → auto-refresh → retry → login if refresh fails

### Runtime Behavior Testing Gate
✅ Module 1 is statically verified with format, type-check, lint, and production build
✅ Critical auth flows are covered in Playwright, so the runtime test strategy is now operational
✅ First Playwright wave covers login, forced password change, forgot-password silent success, reset-password success/failure, and logout redirect
✅ Local default is Chromium only; broader browser coverage can remain a CI or release-candidate concern
⬜ Add explicit session-expiry/auth-expired redirect coverage in a later auth-hardening pass

### Module 2
✅ Three-column layout renders
✅ Server sidebar populates
✅ Channel sidebar shows grouped channels
✅ Notification bell shows unread count
✅ Socket.IO connects and receives events
✅ Mobile: sidebars collapse into drawer

### Module 3
✅ Navigate server → auto-redirect to first channel
✅ Channel sidebar shows channels
✅ Member list shows badges
✅ Create/lock/delete channel (authorized users)

### Module 4
✅ Post feed loads with pinned first
✅ Create post with Tiptap + attachments
✅ Edit post within 24h
✅ Delete post with confirmation
✅ Pin post (authorized users)
✅ Search by title
✅ Filter by priority and date

### Module 5
✅ Notification bell shows count
✅ Real-time notification via Socket.IO
✅ Click notification → navigate to post
✅ Mark as read → count decrements
✅ Notification preferences toggle

### Module 6
✅ Profile page shows user data
✅ Upload profile picture
✅ Edit bio
✅ Admin user list with filters
✅ Create user
✅ Bulk import CSV
✅ Deactivate/reactivate user

### Module 7
✅ Admin dashboard shows stats
✅ Department/Program/Discipline/Class/Course CRUD flows
✅ Curriculum management
✅ Course assignment
✅ Semester progression

### Module 8
✅ Society list
✅ Create society
✅ Join request flow
✅ Approve/reject requests
✅ Add/remove members

### Module 9
✅ Assign role with scope
✅ Revoke role
✅ Permission-aware UI throughout app

---

## Cross-Cutting Concerns

### Error Handling
1. Axios interceptor normalizes all errors
2. TanStack Query `onError` shows toasts
3. Form submissions catch validation errors
4. 403 → "Insufficient permissions" toast
5. 404 → Empty state component
6. 429 → Cooldown toast with retry time

### Pagination
- Default page size: 20, max: 50
- Use paginated backend responses everywhere lists are required
- Use URL query params for explicit page-based screens; allow load-more style interaction for channel feeds on top of paginated API data
- TanStack Query keys include pagination params

### File Uploads
- `FormData` API
- Client-side validation: file type, size
- Progress indicators
- Error handling: file too large, invalid type, network failure

### mustChangePassword Gate
- Enforced by `MustChangePasswordGuard`
- Redirects to `/change-password`
- Backend blocks all other routes with 403
- Socket.IO connection is deferred until the user completes the forced password change flow and logs in again

### Responsive Design
- Mobile-first approach

### Deployment Recommendation
- Default to same-origin production deployment for frontend and backend
- Keep `/api` and `/socket.io` relative in the app by default
- Introduce `VITE_API_URL` and `VITE_SOCKET_URL` only if deployment later requires separate origins

### Security Note
- Avoid putting tokens or secrets in URLs except for the password-reset link delivered by email; once the reset page reads the token, submit it in the request body and do not persist it elsewhere
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Sidebars collapse into drawer on mobile
- Touch-friendly tap targets (min 44x44px)

### Accessibility
- Semantic HTML
- ARIA labels on interactive elements
- Focus management in modals
- Keyboard navigation
- Screen reader announcements

### Performance
- Code splitting per route
- Lazy loading images
- TanStack Query caching (5min stale time by default)
- Debounced search inputs
- Optimistic UI updates

### Runtime Testing Strategy
- Use Testing Library plus MSW for deterministic component and integration coverage
- Use Playwright for real browser runtime behavior, especially auth cookies, route guards, redirects, token refresh, uploads, and responsive navigation
- Use Playwright `webServer` to manage frontend and backend startup during local and CI runs
- Keep the current Playwright setup in the frontend package, with `client/playwright.config.ts` orchestrating both frontend and backend startup
- Launch the backend through `npm run dev:e2e`, which reads `server/.env.e2e` and targets the separate `uniconnect_test` database on an isolated backend port
- Use `client/e2e/global-setup.ts` to rebuild the test schema from committed Prisma migrations and seed only the users needed for focused auth coverage
- Override the frontend dev proxy with `VITE_PROXY_TARGET` during Playwright runs so browser traffic reaches the isolated E2E backend instead of any local development backend already running on port `4000`
- Capture traces on first retry, screenshots only on failure, and videos on first retry
- Prefer committed Playwright tests as the canonical runtime artifacts; use Playwright codegen and trace viewer to accelerate authoring and debugging
- Keep Playwright MCP optional for exploratory agent workflows, not as the primary verification mechanism
- In Ubuntu on WSL2, default to headless Chromium first; use headed mode only when WSLg or equivalent GUI support is known to work reliably

---

## Next Steps

1. **Keep Playwright focused on high-risk runtime behavior** rather than trying to E2E every path
2. **Add explicit auth-expired/session-expiry redirect coverage** when that flow can be exercised deterministically
3. **Use traces and HTML reports** as the debugging baseline for runtime failures
4. **Begin Module 2** implementation now that Module 1 has focused runtime verification
5. **Use PROGRESS.md** to log decisions and track completion

