# UniConnect Frontend Architecture

**Version:** 1.0
**Last Updated:** 2026-03-07

This document outlines the architectural decisions, patterns, and best practices for the UniConnect frontend application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Choices](#technology-choices)
3. [Project Structure](#project-structure)
4. [State Management Strategy](#state-management-strategy)
5. [Routing Architecture](#routing-architecture)
6. [Component Patterns](#component-patterns)
7. [API Integration Layer](#api-integration-layer)
8. [Authentication & Authorization](#authentication--authorization)
9. [Real-time Communication](#real-time-communication)
10. [Form Handling](#form-handling)
11. [Error Handling](#error-handling)
12. [Performance Optimization](#performance-optimization)
13. [Testing Strategy](#testing-strategy)
14. [Accessibility](#accessibility)
15. [Security Considerations](#security-considerations)

---

## Architecture Overview

UniConnect follows a **feature-based architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│  (React Components, Pages, UI, User Interactions)       │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                  State Management Layer                  │
│  TanStack Query (Server State) + Zustand (Client State) │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                   API Integration Layer                  │
│       (axios, interceptors, endpoint functions)          │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                      Backend API                         │
│          (Express REST API + Socket.IO)                  │
└─────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Features are self-contained with co-located pages, components, and hooks
2. **Type Safety**: End-to-end TypeScript with strict mode enabled
3. **Declarative Data Fetching**: TanStack Query handles all server state with automatic caching and refetching
4. **Composition Over Inheritance**: Small, composable components built on shadcn/ui primitives
5. **Progressive Enhancement**: Core functionality works without JavaScript where possible

---

## Technology Choices

### React 19
**Why:** Latest stable version with improved concurrent features, automatic batching, and better server component support (future).

**Key Features Used:**
- Concurrent rendering for better UX during heavy operations
- Automatic batching of state updates
- Improved hooks (useTransition, useDeferredValue for search/filter)

### Vite 7
**Why:** Fastest development experience, instant HMR, optimized production builds.

**Configuration:**
- ESM-only (no legacy bundle)
- Code splitting per route
- Tree shaking for unused code
- Proxy for API and Socket.IO in development

### TypeScript 5.9
**Why:** Maximum type safety, better refactoring, documentation via types.

**Configuration:**
- `strict: true` - All strict checks enabled
- `noUncheckedIndexedAccess: true` - Safer array/object access
- Path aliases: `@/*` for clean imports

### shadcn/ui + Tailwind v4
**Why:** Copy-paste components (no dependency lock-in), accessible by default, highly customizable.

**Approach:**
- Components are in our codebase, not node_modules
- Built on Base UI primitives in shadcn/ui v4 (WAI-ARIA aligned)
- Tailwind v4 for utility-first styling with JIT compilation

### TanStack Query v5
**Why:** Industry-standard server state management, automatic caching, background refetching, optimistic updates.

**Configuration:**
- 5-minute stale time (data refetched after 5 min)
- Automatic retries on failure (1 retry)
- Query key conventions for cache invalidation
- Global query and mutation error toasts for unhandled API failures

### Zustand
**Why:** Minimal client state management (auth, notification count), no provider boilerplate, tiny bundle (~1KB).

**Usage:**
- Auth store (user, isAuthenticated, setUser, clearUser)
- Notification store (unreadCount, set/increment/decrement)

### React Hook Form + Zod
**Why:** Performant form handling with minimal re-renders, runtime validation with Zod (shared with backend).

**Pattern:**
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Tiptap
**Why:** Headless rich text editor, full control over UI, extensible, modern API.

**Configuration:**
- StarterKit (bold, italic, headings, lists)
- CharacterCount (5000 max)
- Placeholder extension

### Socket.IO Client
**Why:** Real-time notifications, backend already uses Socket.IO, WebSocket with fallback to polling.

**Usage:**
- Connect with httpOnly cookie auth
- Listen for `notification:new`, `notification:unread-count`, `auth:expired`

---

## Project Structure

```
client/
├── src/
│   ├── api/                     # API integration layer
│   │   ├── client.ts            # Axios instance + interceptors
│   │   └── endpoints/           # API functions per resource
│   │       ├── auth.api.ts
│   │       ├── users.api.ts
│   │       ├── servers.api.ts
│   │       ├── channels.api.ts
│   │       ├── posts.api.ts
│   │       ├── notifications.api.ts
│   │       ├── departments.api.ts
│   │       ├── programs.api.ts
│   │       ├── disciplines.api.ts
│   │       ├── classes.api.ts
│   │       ├── courses.api.ts
│   │       ├── societies.api.ts
│   │       ├── roles.api.ts
│   │       └── admin.api.ts
│   │
│   ├── components/              # Shared components
│   │   ├── ui/                  # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ... (all shadcn components)
│   │   │
│   │   ├── layout/              # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── ServerSidebar.tsx
│   │   │   ├── ChannelSidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── UserDropdown.tsx
│   │   │   ├── MobileDrawer.tsx
│   │   │   └── AdminLayout.tsx
│   │   │
│   │   └── shared/              # Shared reusable components
│   │       ├── ErrorBoundary.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── RoleBadge.tsx
│   │       └── AvatarWithBadge.tsx
│   │
│   ├── features/                # Feature modules (co-located)
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── ForgotPasswordPage.tsx
│   │   │   │   ├── ResetPasswordPage.tsx
│   │   │   │   └── ForceChangePasswordPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   ├── ResetPasswordForm.tsx
│   │   │   │   ├── ChangePasswordForm.tsx
│   │   │   │   ├── PasswordStrengthIndicator.tsx
│   │   │   │   └── AuthLayout.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts
│   │   │   │   ├── useLogout.ts
│   │   │   │   └── useChangePassword.ts
│   │   │   └── schemas.ts       # Zod schemas
│   │   │
│   │   ├── servers/             # Server views
│   │   ├── channels/            # Channel views
│   │   ├── posts/               # Post feed, creation, editing
│   │   ├── notifications/       # Notifications
│   │   ├── profile/             # User profile
│   │   ├── admin/               # Admin dashboard and CRUD
│   │   ├── societies/           # Society management
│   │   └── roles/               # Role assignment
│   │
│   ├── hooks/                   # Shared custom hooks
│   │   ├── useAuth.ts           # Auth helpers
│   │   ├── usePagination.ts     # Pagination logic
│   │   ├── useDebounce.ts       # Debounce hook
│   │   ├── usePermissions.ts    # Permission checks
│   │   └── useLocalStorage.ts   # Local storage wrapper
│   │
│   ├── lib/                     # Utilities and configuration
│   │   ├── socket.ts            # Socket.IO client
│   │   ├── query-client.ts      # TanStack Query config
│   │   ├── utils.ts             # Helper functions (cn, date formatting)
│   │   └── constants.ts         # App-wide constants
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── auth.store.ts        # Auth state
│   │   └── notification.store.ts # Notification count
│   │
│   ├── types/                   # TypeScript type definitions
│   │   ├── api.types.ts         # ApiResponse, PaginatedResponse, etc.
│   │   ├── auth.types.ts        # Auth-related types
│   │   ├── user.types.ts        # User types
│   │   ├── server.types.ts      # Server types
│   │   ├── channel.types.ts     # Channel types
│   │   ├── post.types.ts        # Post types
│   │   ├── notification.types.ts # Notification types
│   │   ├── admin.types.ts       # Admin types
│   │   ├── role.types.ts        # Role types
│   │   └── society.types.ts     # Society types
│   │
│   ├── routes/                  # Routing configuration
│   │   ├── index.tsx            # Route tree definition
│   │   └── guards/              # Route protection
│   │       ├── AuthGuard.tsx
│   │       ├── MustChangePasswordGuard.tsx
│   │       └── AdminGuard.tsx
│   │
│   ├── App.tsx                  # Root app component
│   └── main.tsx                 # Entry point
│
├── public/                      # Static assets
├── .env.development             # Development environment variables
├── .env.production              # Production environment variables
├── vite.config.ts               # Vite configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies
└── README.md                    # Quick start guide
```

### Feature Module Structure

Each feature follows this pattern:

```
features/posts/
├── pages/
│   └── PostFeedPage.tsx         # Route-level component
├── components/
│   ├── PostFeed.tsx             # Feature-specific components
│   ├── PostCard.tsx
│   ├── PostDetail.tsx
│   ├── CreatePostForm.tsx
│   ├── EditPostForm.tsx
│   └── PostActions.tsx
├── hooks/
│   ├── usePosts.ts              # Custom hooks for this feature
│   ├── useCreatePost.ts
│   └── useCanEditPost.ts
├── schemas.ts                   # Zod validation schemas
└── utils.ts                     # Feature-specific utilities
```

---

## State Management Strategy

### Server State (TanStack Query)

**What:** Data from the backend (servers, channels, posts, users, etc.)

**Why TanStack Query:**
- Automatic caching with configurable stale time
- Background refetching on window focus
- Request deduplication (multiple components calling same query = 1 request)
- Optimistic updates with automatic rollback on error
- Infinite scroll and pagination support

**Query Key Convention:**
```typescript
// Simple query
['servers']

// Parameterized query
['servers', serverId]

// With filters
['posts', channelId, { search, priority, page }]

// Nested resource
['servers', serverId, 'members', { page }]
```

**Example Query:**
```typescript
export function useServerChannels(serverId: number) {
  return useQuery({
    queryKey: ['servers', serverId, 'channels'],
    queryFn: () => serversApi.listChannels(serverId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    enabled: !!serverId,         // Only run if serverId exists
  });
}
```

**Example Mutation:**
```typescript
export function useCreatePost(channelId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostDto) =>
      postsApi.create(channelId, data),
    onSuccess: () => {
      // Invalidate posts query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['posts', channelId],
      });
      toast.success('Post created successfully');
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    },
  });
}
```

### Client State (Zustand)

**What:** UI state that doesn't come from the backend (auth session, notification count, UI toggles)

**Why Zustand:**
- Minimal boilerplate
- No provider wrapper needed
- Works outside React components
- Tiny bundle size

**Auth Store:**
```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));
```

**Notification Store:**
```typescript
// src/stores/notification.store.ts
import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
}));
```

### URL State (React Router)

**What:** Filter parameters, search queries, page numbers

**Why URL State:**
- Shareable links
- Browser back/forward works
- Bookmarkable

**Example:**
```typescript
const [searchParams, setSearchParams] = useSearchParams();

const search = searchParams.get('search') || '';
const priority = searchParams.get('priority') || undefined;
const page = parseInt(searchParams.get('page') || '1');

const updateFilters = (newFilters: Partial<PostFilters>) => {
  const params = new URLSearchParams(searchParams);
  Object.entries(newFilters).forEach(([key, value]) => {
    if (value) params.set(key, String(value));
    else params.delete(key);
  });
  setSearchParams(params);
};
```

---

## Routing Architecture

### React Router v7

**Route Tree:**
```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },

  // Protected routes (wrapped in AuthGuard)
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MustChangePasswordGuard />,
        children: [
          {
            path: '/',
            element: <AppShell />,
            children: [
              {
                index: true,
                element: <Navigate to="/servers" replace />,
              },
              {
                path: 'servers',
                children: [
                  {
                    path: ':serverId',
                    element: <ServerPage />,
                    children: [
                      {
                        path: 'channels/:channelId',
                        element: <ChannelPage />,
                      },
                      {
                        path: 'members',
                        element: <MemberListPage />,
                      },
                    ],
                  },
                ],
              },
              {
                path: 'profile',
                element: <ProfilePage />,
              },
              {
                path: 'settings',
                children: [
                  {
                    path: 'password',
                    element: <ChangePasswordPage />,
                  },
                  {
                    path: 'notifications',
                    element: <NotificationPreferencesPage />,
                  },
                ],
              },
              {
                element: <AdminGuard />,
                children: [
                  {
                    path: 'admin',
                    element: <AdminLayout />,
                    children: [
                      {
                        path: 'dashboard',
                        element: <AdminDashboardPage />,
                      },
                      // ... all admin routes
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      // Special route for forced password change (bypasses MustChangePasswordGuard)
      {
        path: '/change-password',
        element: <ForceChangePasswordPage />,
      },
    ],
  },
]);
```

### Route Guards

**AuthGuard:**
```typescript
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => usersApi.getProfile(),
    retry: false,
  });

  if (isLoading || userLoading) return <LoadingSpinner />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

**MustChangePasswordGuard:**
```typescript
export function MustChangePasswordGuard() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
```

**AdminGuard:**
```typescript
export function AdminGuard() {
  const { user } = useAuthStore();

  if (user?.userType !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
        <Button asChild className="mt-4">
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
```

---

## Component Patterns

### Composition Pattern (Preferred)

**Bad (Prop Drilling):**
```typescript
<PostCard
  title={post.title}
  content={post.content}
  author={post.author}
  priority={post.priority}
  isPinned={post.isPinned}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onPin={handlePin}
/>
```

**Good (Composition):**
```typescript
<PostCard post={post}>
  <PostCard.Header>
    <PostCard.Author author={post.author} />
    <PostCard.Timestamp createdAt={post.createdAt} />
  </PostCard.Header>
  <PostCard.Content>{post.content}</PostCard.Content>
  <PostCard.Actions>
    <PostCard.EditButton onClick={handleEdit} />
    <PostCard.DeleteButton onClick={handleDelete} />
    <PostCard.PinButton isPinned={post.isPinned} onClick={handlePin} />
  </PostCard.Actions>
</PostCard>
```

### Custom Hooks for Complex Logic

Extract complex logic into custom hooks:

```typescript
// src/features/posts/hooks/useCanEditPost.ts
export function useCanEditPost(post: PostListItem) {
  const { user } = useAuthStore();

  const isAuthor = user?.id === post.author.id;
  const createdAt = new Date(post.createdAt);
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const within24Hours = hoursSinceCreation < 24;

  return isAuthor && within24Hours;
}

// Usage in component
const canEdit = useCanEditPost(post);

{canEdit && <Button onClick={handleEdit}>Edit</Button>}
```

### Controlled vs Uncontrolled Components

**Controlled (Form Inputs):**
```typescript
const [value, setValue] = useState('');

<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Uncontrolled (React Hook Form):**
```typescript
const { register } = useForm();

<Input {...register('email')} />
```

### Loading States

**Skeleton Loaders (Preferred):**
```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
```

**Spinner (Fallback):**
```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```

---

## API Integration Layer

All API calls go through a centralized API layer with axios.

### Axios Instance

```typescript
// src/api/client.ts
import axios from 'axios';
import { authStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/query-client';
import { disconnectSocket } from '@/lib/socket';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: unwrap data
apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.success) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    // 401 Unauthorized: attempt token refresh
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        await apiClient.post('/auth/refresh');
        return apiClient(error.config);
      } catch (refreshError) {
        // Refresh failed, logout
        authStore.clearUser();
        queryClient.clear();
        disconnectSocket();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Normalize error
    const apiError = new ApiError(
      error.response?.data?.error?.code || 'INTERNAL_ERROR',
      error.response?.data?.error?.message || 'An error occurred',
      error.response?.data?.error?.details || [],
      error.response?.status || 500
    );

    return Promise.reject(apiError);
  }
);
```

### Endpoint Functions

```typescript
// src/api/endpoints/posts.api.ts
import { apiClient } from '../client';
import type { PostListParams, PostDetailunknown, CreatePostDto, UpdatePostDto } from '@/types/post.types';

export const postsApi = {
  list: (channelId: number, params: PostListParams) =>
    apiClient.get(`/channels/${channelId}/posts`, { params }),

  get: (postId: number) =>
    apiClient.get(`/posts/${postId}`),

  create: (channelId: number, formData: FormData) =>
    apiClient.post(`/channels/${channelId}/posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (postId: number, data: UpdatePostDto) =>
    apiClient.patch(`/posts/${postId}`, data),

  delete: (postId: number) =>
    apiClient.delete(`/posts/${postId}`),

  pin: (postId: number, isPinned: boolean) =>
    apiClient.patch(`/posts/${postId}/pin`, { isPinned }),
};
```

---

## Authentication & Authorization

### Cookie-Based Auth

- Backend sets `access_token` and `refresh_token` httpOnly cookies
- Frontend sends cookies automatically with `withCredentials: true`
- 401 interceptor handles token refresh transparently

### Permission-Aware UI

```typescript
// src/hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuthStore();

  if (user?.userType === 'ADMIN') {
    return {
      canManageChannels: () => true,
      canPinPosts: () => true,
      canDeactivateUsers: () => true,
    };
  }

  const roles = user?.roles || [];

  return {
    canManageChannels: (serverId: number) => {
      // Check if user has management role for this server
      return roles.some(r => ['hod', 'cr', 'president', 'convenor'].includes(r));
    },

    canPinPosts: (channelId: number) => {
      // Check if user has lock:channel permission
      return roles.some(r => ['hod', 'cr', 'moderator'].includes(r));
    },

    canDeactivateUsers: () => false,
  };
}
```

**Can Component:**
```typescript
// src/components/shared/Can.tsx
export interface CanProps {
  action: keyof ReturnType<typeof usePermissions>;
  serverId?: number;
  channelId?: number;
  children: React.ReactNode;
}

export function Can({ action, serverId, channelId, children }: CanProps) {
  const permissions = usePermissions();
  const allowed = permissions[action]?.(serverId ||channelId);

  return allowed ? <>{children}</> : null;
}

// Usage
<Can action="canManageChannels" serverId={serverId}>
  <Button>Create Channel</Button>
</Can>
```

---

## Real-time Communication

### Socket.IO Setup

```typescript
// src/lib/socket.ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
```

Recommended default: keep the socket on the same origin as the frontend and backend. Use `VITE_SOCKET_URL` only if deployment later requires a separate socket origin.

### Event Listeners (in AppShell)

```typescript
// In AppShell.tsx
useEffect(() => {
  if (!isAuthenticated || user?.mustChangePassword) return;

  const socket = connectSocket();

  socket.on('notification:new', (notification: Notification) => {
    queryClient.setQueryData(['notifications'], (old: any) => ({
      ...old,
      data: [notification, ...(old?.data || [])],
    }));

    notificationStore.incrementUnread();

    if (notification.post?.priority === 'URGENT') {
      toast.error(notification.title);
    }
  });

  socket.on('notification:unread-count', ({ count }: { count: number }) => {
    notificationStore.setUnreadCount(count);
  });

  socket.on('auth:expired', () => {
    authStore.clearUser();
    queryClient.clear();
    disconnectSocket();
    navigate('/login');
  });

  return () => {
    socket.off('notification:new');
    socket.off('notification:unread-count');
    socket.off('auth:expired');
  };
}, [isAuthenticated]);
```

---

## Form Handling

### React Hook Form + Zod

```typescript
// src/features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../schemas';

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && <p className="text-red-500">{errors.password.message}</p>}
      </div>

      <Button type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

---

## Error Handling

### Global Error Boundary

```typescript
// src/components/shared/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Toast Notifications

```typescript
// TanStack Query global error handler
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error: ApiError) => {
        if (error.code !== 'VALIDATION_ERROR') {
          toast.error(error.message);
        }
      },
    },
  },
});
```

---

## Performance Optimization

1. **Code Splitting**: Routes are lazy-loaded
2. **Image Optimization**: Use `loading="lazy"` on images
3. **Debounced Search**: 500ms debounce on search inputs
4. **Optimistic Updates**: Update UI immediately, rollback on error
5. **Query Stale Time**: 5-minute cache reduces unnecessary API calls
6. **Bundle Analysis**: Use `rollup-plugin-visualizer` with Vite builds

---

## Testing Strategy

### Unit Tests (Vitest)
- Required for shared utilities, permission logic, and Zustand stores
- Run as part of the standard quality gate for each completed module

### Component Tests (Testing Library)
- Required for forms, guarded routes, and stateful UI flows in each module
- Use MSW for API-backed component and integration tests

### E2E Tests (Playwright)
- Cover critical end-to-end flows after the core shell is stable
- Prioritize login, forced password change, post creation, notifications, and admin CRUD smoke paths

### Recommended Quality Gate
- Balanced coverage is the default: unit plus component or integration tests for each module before it is marked complete
- Add Playwright coverage for the highest-risk flows before release candidates

---

## Accessibility

1. **Semantic HTML**: Use `<header>`, `<nav>`, `<main>`, `<article>`, etc.
2. **ARIA Labels**: All interactive elements have labels
3. **Keyboard Navigation**: All actions accessible via keyboard
4. **Focus Management**: Focus trapped in modals, focus moved on navigation
5. **Screen Reader Support**: Dynamic content announced

---

## Security Considerations

1. **XSS Protection**: DOMPurify sanitizes all rendered HTML
2. **httpOnly Cookies**: Tokens inaccessible to JavaScript
3. **CSRF Protection**: SameSite=Strict cookies
4. **Rate Limiting**: Backend enforces rate limits
5. **Input Validation**: Zod schemas validate all inputs
6. **Sensitive Data in URLs**: Avoid tokens and secrets in URLs, except for the controlled password-reset link delivered by email; read the token once and submit it in the request body

---

**Last Updated:** 2026-03-07
**Maintained By:** Frontend Team
