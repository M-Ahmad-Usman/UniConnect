import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AppShell } from '@/components/layout/AppShell';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AcademicLayout } from '@/components/layout/AcademicLayout';
import { AuthGuard } from './guards/AuthGuard';
import { MustChangePasswordGuard } from './guards/MustChangePasswordGuard';
import { AdminGuard } from './guards/AdminGuard';
import { AcademicGuard } from './guards/AcademicGuard';
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
const DepartmentListPage = lazy(() =>
  import('@/features/admin/pages/DepartmentListPage').then((m) => ({
    default: m.DepartmentListPage,
  })),
);
const DepartmentDetailPage = lazy(() =>
  import('@/features/admin/pages/DepartmentDetailPage').then((m) => ({
    default: m.DepartmentDetailPage,
  })),
);
const ProgramListPage = lazy(() =>
  import('@/features/admin/pages/ProgramListPage').then((m) => ({
    default: m.ProgramListPage,
  })),
);
const CurriculumPage = lazy(() =>
  import('@/features/admin/pages/CurriculumPage').then((m) => ({
    default: m.CurriculumPage,
  })),
);
const DisciplineListPage = lazy(() =>
  import('@/features/admin/pages/DisciplineListPage').then((m) => ({
    default: m.DisciplineListPage,
  })),
);
const ClassListPage = lazy(() =>
  import('@/features/admin/pages/ClassListPage').then((m) => ({
    default: m.ClassListPage,
  })),
);
const ClassDetailPage = lazy(() =>
  import('@/features/admin/pages/ClassDetailPage').then((m) => ({
    default: m.ClassDetailPage,
  })),
);
const CourseListPage = lazy(() =>
  import('@/features/admin/pages/CourseListPage').then((m) => ({
    default: m.CourseListPage,
  })),
);
const NotificationInboxPage = lazy(() =>
  import('@/features/notifications/pages/NotificationInboxPage').then((m) => ({
    default: m.NotificationInboxPage,
  })),
);
const NotificationPreferencesPage = lazy(() =>
  import('@/features/notifications/pages/NotificationPreferencesPage').then((m) => ({
    default: m.NotificationPreferencesPage,
  })),
);
const NotificationSettingsServerPickerPage = lazy(() =>
  import('@/features/notifications/pages/NotificationSettingsServerPickerPage').then((m) => ({
    default: m.NotificationSettingsServerPickerPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/features/profile/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const AdminUserListPage = lazy(() =>
  import('@/features/admin/pages/AdminUserListPage').then((m) => ({
    default: m.AdminUserListPage,
  })),
);
const CreateUserPage = lazy(() =>
  import('@/features/admin/pages/CreateUserPage').then((m) => ({ default: m.CreateUserPage })),
);
const BulkImportPage = lazy(() =>
  import('@/features/admin/pages/BulkImportPage').then((m) => ({ default: m.BulkImportPage })),
);
const SocietyListPage = lazy(() =>
  import('@/features/societies/pages/SocietyListPage').then((m) => ({
    default: m.SocietyListPage,
  })),
);
const SocietyDetailPage = lazy(() =>
  import('@/features/societies/pages/SocietyDetailPage').then((m) => ({
    default: m.SocietyDetailPage,
  })),
);
const RoleManagementPage = lazy(() =>
  import('@/features/roles/pages/RoleManagementPage').then((m) => ({
    default: m.RoleManagementPage,
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

function NotFoundPage() {
  return <Placeholder label="Page Not Found" />;
}

function RedirectToAcademicClass() {
  const { classId } = useParams();
  return <Navigate to={ROUTES.ACADEMICS_CLASS(classId ?? '')} replace />;
}

function RedirectToAcademicCurriculum() {
  const { programId } = useParams();
  return <Navigate to={ROUTES.ACADEMICS_PROGRAM_CURRICULUM(programId ?? '')} replace />;
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
                          {
                            path: 'settings/notifications',
                            element: <NotificationPreferencesPage />,
                          },
                        ],
                      },
                    ],
                  },
                  { path: 'notifications', element: <NotificationInboxPage /> },
                  { path: 'profile', element: <ProfilePage /> },
                  {
                    path: 'societies',
                    children: [
                      { index: true, element: <SocietyListPage /> },
                      { path: ':societyId', element: <SocietyDetailPage /> },
                    ],
                  },
                  { path: 'roles', element: <RoleManagementPage /> },
                  {
                    element: <AcademicGuard />,
                    children: [
                      {
                        path: 'academics',
                        element: <AcademicLayout />,
                        children: [
                          { index: true, element: <Navigate to={ROUTES.ACADEMICS_CLASSES} replace /> },
                          {
                            path: 'classes',
                            children: [
                              { index: true, element: <ClassListPage /> },
                              { path: ':classId', element: <ClassDetailPage /> },
                            ],
                          },
                          {
                            path: 'programs/:programId/curriculum',
                            element: <CurriculumPage />,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    path: 'settings',
                    children: [
                      { path: 'password', element: <ChangePasswordPage /> },
                      {
                        path: 'notifications',
                        element: <NotificationSettingsServerPickerPage />,
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
                            index: true,
                            element: <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />,
                          },
                          { path: 'dashboard', element: <AdminDashboardPage /> },
                          {
                            path: 'users',
                            children: [
                              { index: true, element: <AdminUserListPage /> },
                              { path: 'new', element: <CreateUserPage /> },
                              { path: 'import', element: <BulkImportPage /> },
                            ],
                          },
                          {
                            path: 'departments',
                            children: [
                              { index: true, element: <DepartmentListPage /> },
                              { path: ':departmentId', element: <DepartmentDetailPage /> },
                            ],
                          },
                          {
                            path: 'programs',
                            children: [
                              { index: true, element: <ProgramListPage /> },
                              {
                                path: ':programId/curriculum',
                                element: <RedirectToAcademicCurriculum />,
                              },
                            ],
                          },
                          { path: 'disciplines', element: <DisciplineListPage /> },
                          {
                            path: 'classes',
                            children: [
                              {
                                index: true,
                                element: <Navigate to={ROUTES.ACADEMICS_CLASSES} replace />,
                              },
                              {
                                path: ':classId',
                                element: <RedirectToAcademicClass />,
                              },
                            ],
                          },
                          { path: 'courses', element: <CourseListPage /> },
                          { path: 'societies', element: <Navigate to={ROUTES.SOCIETIES} replace /> },
                          { path: 'roles', element: <Navigate to={ROUTES.ROLES} replace /> },
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
