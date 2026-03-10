import { Bell, KeyRound, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/hooks/useLogout';

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserDropdown() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-auto px-2 py-1.5" aria-label="Open user menu" />}
      >
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarImage src={undefined} alt={user.fullName} />
            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left sm:block">
            <p className="max-w-32 truncate text-sm font-medium">{user.fullName}</p>
            <p className="text-muted-foreground max-w-32 truncate text-xs">{user.email}</p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            <RoleBadge role={user.userType} className="mt-1 inline-flex" />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(ROUTES.PROFILE)}>
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS_NOTIFICATIONS)}>
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