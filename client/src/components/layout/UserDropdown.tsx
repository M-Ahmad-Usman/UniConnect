import {
  Bell,
  BookOpen,
  Building2,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { parseRouteParamPublicId } from '@/lib/route-params';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { isAdminUser } from '@/lib/roles';

export function UserDropdown() {
  const navigate = useNavigate();
  const params = useParams();
  const serverPublicId = parseRouteParamPublicId(params.serverPublicId);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const permissionsQuery = useMyPermissions();
  const canAccessAdminDashboard =
    permissionsQuery.data?.global.canAccessAdminDashboard ?? isAdminUser(user);
  const canManageRoles = permissionsQuery.data?.roleWorkspace.canOpenRoleManagement ?? false;
  const canAccessAcademics = permissionsQuery.data?.global.canAccessAcademicWorkspace ?? false;
  const canAccessEnrollment = permissionsQuery.data?.global.canAccessEnrollmentWorkspace ?? false;
  const canAccessTeaching = permissionsQuery.data?.global.canAccessTeachingWorkspace ?? false;

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-auto px-2 py-1.5" aria-label="Open user menu" />
        }
      >
        <div className="flex items-center gap-3">
          <UserAvatar
            size="sm"
            fullName={user.fullName}
            profilePictureUrl={user.profilePictureUrl}
          />
          <div className="hidden text-left sm:block">
            <p className="max-w-32 truncate text-sm font-medium">{user.fullName}</p>
            <p className="text-muted-foreground max-w-32 truncate text-xs">{user.email}</p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold">{user.fullName}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              <RoleBadge role={user.userType} className="mt-1 inline-flex" />
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {canAccessAdminDashboard ? (
            <DropdownMenuItem onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>
              <LayoutDashboard className="size-4" />
              Admin dashboard
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE)}>
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(ROUTES.SOCIETIES)}>
            <Building2 className="size-4" />
            Societies
          </DropdownMenuItem>
          {canAccessAcademics ? (
            <DropdownMenuItem onClick={() => navigate(ROUTES.ACADEMICS_PROGRAMS)}>
              <GraduationCap className="size-4" />
              Academics
            </DropdownMenuItem>
          ) : null}
          {canAccessTeaching ? (
            <DropdownMenuItem onClick={() => navigate(ROUTES.TEACHING)}>
              <BookOpen className="size-4" />
              My Teaching
            </DropdownMenuItem>
          ) : null}
          {canAccessEnrollment ? (
            <DropdownMenuItem onClick={() => navigate(ROUTES.ENROLLMENT_CLASSES)}>
              <User className="size-4" />
              Enrollment
            </DropdownMenuItem>
          ) : null}
          {canManageRoles ? (
            <DropdownMenuItem onClick={() => navigate(ROUTES.ROLES)}>
              <Shield className="size-4" />
              Roles
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              navigate(
                serverPublicId
                  ? ROUTES.SERVER_NOTIFICATION_SETTINGS(serverPublicId)
                  : ROUTES.SETTINGS_NOTIFICATIONS,
              )
            }
          >
            <Bell className="size-4" />
            Notification settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS_PASSWORD)}>
            <KeyRound className="size-4" />
            Change password
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout.mutate()} variant="destructive">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
