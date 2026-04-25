import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AppShell } from '@/components/layout/AppShell';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AdminSectionPage } from '@/features/admin/pages/AdminSectionPage';
import { AuthGuard } from './guards/AuthGuard';
import { MustChangePasswordGuard } from './guards/MustChangePasswordGuard';
import { AdminGuard } from './guards/AdminGuard';
import { ForceChangePasswordGuard } from './guards/ForceChangePasswordGuard';
import { GuestGuard } from './guards/GuestGuard';
import { ROUTES } from '@/lib/constants';

// ─── Lazy-loaded page components ────────────────────────────────────────────

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const ForceChangePasswordPage = lazy(() =>
  import('@/features/auth/pages/ForceChangePasswordPage').then((m) => ({
    default: m.ForceChangePasswordPage,
  })),
);
const ChangePasswordPage = lazy(() =>
  import('@/features/auth/pages/ChangePasswordPage').then((m) => ({
    default: m.ChangePasswordPage,
  })),
);
const ServersPage = lazy(() =>
  import('@/features/servers/pages/ServersPage').then((m) => ({ default: m.ServersPage })),
);
const ServerPage = lazy(() =>
  import('@/features/servers/pages/ServerPage').then((m) => ({ default: m.ServerPage })),
);
const MemberListPage = lazy(() =>
  import('@/features/servers/pages/MemberListPage').then((m) => ({ default: m.MemberListPage })),
);
const ChannelPage = lazy(() =>
  import('@/features/channels/pages/ChannelPage').then((m) => ({ default: m.ChannelPage })),
);
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/pages/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
);

// ─── Placeholder components for routes not yet implemented ──────────────────

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground text-lg">{label} — Coming Soon</p>
    </div>
  );
}

function ProfilePage() {
  return <Placeholder label="Profile" />;
}
function NotificationPreferencesPage() {
  return <Placeholder label="Notification Preferences" />;
}
function NotFoundPage() {
  return <Placeholder label="Page Not Found" />;
}

// ─── Suspense wrapper for lazy-loaded routes ───────────────────────────────

function SuspenseOutlet() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Outlet />
    </Suspense>
  );
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // Public routes — redirect authenticated users to /servers
  {
    element: <GuestGuard />,
    children: [
      {
        element: <SuspenseOutlet />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
    ],
  },

  // Protected routes
  {
    element: <AuthGuard />,
    children: [
      // Must-change-password guard wraps most routes
      {
        element: <MustChangePasswordGuard />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                element: <SuspenseOutlet />,
                children: [
                  { index: true, element: <Navigate to="/servers" replace /> },
                  {
                    path: 'servers',
                    children: [
                      { index: true, element: <ServersPage /> },
                      {
                        path: ':serverId',
                        children: [
                          { index: true, element: <ServerPage /> },
                          { path: 'channels/:channelId', element: <ChannelPage /> },
                          { path: 'members', element: <MemberListPage /> },
                        ],
                      },
                    ],
                  },
                  { path: 'profile', element: <ProfilePage /> },
                  {
                    path: 'settings',
                    children: [
                      { path: 'password', element: <ChangePasswordPage /> },
                      { path: 'notifications', element: <NotificationPreferencesPage /> },
                    ],
                  },
                  {
                    element: <AdminGuard />,
                    children: [
                      {
                        path: 'admin',
                        element: <AdminLayout />,
                        children: [
                          { index: true, element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace /> },
                          { path: 'dashboard', element: <AdminDashboardPage /> },
                          {
                            path: 'users',
                            element: (
                              <AdminSectionPage
                                title="Users"
                                description="User management will plug into this new admin shell in a later module."
                              />
                            ),
                          },
                          {
                            path: 'departments',
                            element: (
                              <AdminSectionPage
                                title="Departments"
                                description="Department CRUD will land on top of the current admin navigation structure."
                              />
                            ),
                          },
                          {
                            path: 'programs',
                            element: (
                              <AdminSectionPage
                                title="Programs"
                                description="Program management screens are intentionally deferred beyond Module 2."
                              />
                            ),
                          },
                          {
                            path: 'disciplines',
                            element: (
                              <AdminSectionPage
                                title="Disciplines"
                                description="Discipline management will reuse this admin shell once its CRUD flows are implemented."
                              />
                            ),
                          },
                          {
                            path: 'classes',
                            element: (
                              <AdminSectionPage
                                title="Classes"
                                description="Class management is deferred, but its route and navigation slot are now in place."
                              />
                            ),
                          },
                          {
                            path: 'courses',
                            element: (
                              <AdminSectionPage
                                title="Courses"
                                description="Course management and channel generation will land in later modules."
                              />
                            ),
                          },
                          {
                            path: 'societies',
                            element: (
                              <AdminSectionPage
                                title="Societies"
                                description="Society administration is queued for later modules, not Module 2."
                              />
                            ),
                          },
                          {
                            path: 'roles',
                            element: (
                              <AdminSectionPage
                                title="Roles"
                                description="Role assignment and permission management will build on this shell later."
                              />
                            ),
                          },
                        ],
                      },
                    ],
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
      // Force change password — inside AuthGuard but outside MustChangePasswordGuard
      {
        element: <ForceChangePasswordGuard />,
        children: [
          {
            element: <SuspenseOutlet />,
            children: [{ path: '/change-password', element: <ForceChangePasswordPage /> }],
          },
        ],
      },
    ],
  },
]);
