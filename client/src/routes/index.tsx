import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AuthGuard } from './guards/AuthGuard';
import { MustChangePasswordGuard } from './guards/MustChangePasswordGuard';
import { AdminGuard } from './guards/AdminGuard';
import { ForceChangePasswordGuard } from './guards/ForceChangePasswordGuard';
import { GuestGuard } from './guards/GuestGuard';

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

// ─── Placeholder components for routes not yet implemented ──────────────────

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-muted-foreground text-lg">{label} — Coming Soon</p>
    </div>
  );
}

function ServersPage() {
  return <Placeholder label="Servers" />;
}

// Minimal AppShell placeholder — real layout in Module 2
function AppShell() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function ServerLayout() {
  return <Outlet />;
}

function ServerPage() {
  return <Placeholder label="Server" />;
}
function ChannelPage() {
  return <Placeholder label="Channel" />;
}
function MemberListPage() {
  return <Placeholder label="Members" />;
}
function ProfilePage() {
  return <Placeholder label="Profile" />;
}
function NotificationPreferencesPage() {
  return <Placeholder label="Notification Preferences" />;
}
function AdminLayout() {
  return <Outlet />;
}
function AdminDashboardPage() {
  return <Placeholder label="Admin Dashboard" />;
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
              { index: true, element: <Navigate to="/servers" replace /> },
              {
                path: 'servers',
                children: [
                  { index: true, element: <ServersPage /> },
                  {
                    path: ':serverId',
                    element: <ServerLayout />,
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
                    children: [{ path: 'dashboard', element: <AdminDashboardPage /> }],
                  },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
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
