import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Phone, RotateCcw, UserX } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/features/auth/utils';
import { getInitials, formatDate } from '@/features/profile/utils';
import { useAuthStore } from '@/stores/auth.store';
import type { DepartmentListItem } from '@/types';
import { useDeactivateUser, useReactivateUser } from '../hooks/useUserActivation';
import { useUserDetail } from '../hooks/useUserDetail';

interface UserDetailDialogProps {
  userId: number | null;
  departments: DepartmentListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value ?? 'Not set'}</p>
    </div>
  );
}

export function UserDetailDialog({
  userId,
  departments,
  open,
  onOpenChange,
}: UserDetailDialogProps) {
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const detailQuery = useUserDetail(userId, open);
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const user = detailQuery.data;
  const department = departments.find((item) => item.id === user?.departmentId);
  const isSelf = currentUser?.id === user?.id;

  async function handleActivationChange() {
    if (!user || !confirmAction) {
      return;
    }

    try {
      if (confirmAction === 'deactivate') {
        await deactivate.mutateAsync(user.id);
        toast.success('User deactivated.');
      } else {
        await reactivate.mutateAsync(user.id);
        toast.success('User reactivated.');
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update user status.'));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Read-only account and academic information.</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <LoadingSpinner />
          ) : detailQuery.isError || !user ? (
            <EmptyState
              title="Unable to load user"
              description="This user could not be loaded right now."
              action={{ label: 'Retry', onClick: () => void detailQuery.refetch() }}
            />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="size-20 text-xl">
                  <AvatarImage src={user.profilePictureUrl ?? undefined} alt={user.fullName} />
                  <AvatarFallback className="text-xl">{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h2 className="break-words text-xl font-semibold">{user.fullName}</h2>
                    <p className="text-sm text-muted-foreground">
                      Joined {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role={user.userType} />
                    <Badge variant={user.isActive ? 'default' : 'destructive'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.mustChangePassword ? (
                      <Badge variant="outline">Password change required</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <p className="flex min-w-0 items-center gap-2 rounded-lg border bg-background p-3 text-sm">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{user.email}</span>
                </p>
                <p className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm">
                  <Phone className="size-4 shrink-0 text-muted-foreground" />
                  {user.phone}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Gender" value={user.gender} />
                <DetailField label="Department" value={department?.name ?? user.departmentId} />
                {user.studentInfo ? (
                  <>
                    <DetailField label="Roll number" value={user.studentInfo.rollNumber} />
                    <DetailField label="Class ID" value={user.studentInfo.classId} />
                  </>
                ) : null}
                {user.teacherInfo ? (
                  <DetailField label="Designation" value={user.teacherInfo.designation} />
                ) : null}
              </div>

              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Bio</p>
                <p className="mt-1 max-h-40 overflow-y-auto break-words text-sm whitespace-pre-wrap">
                  {user.bio || 'No bio added.'}
                </p>
              </div>
            </div>
          )}

          {user ? (
            <DialogFooter>
              <Button
                type="button"
                variant={user.isActive ? 'destructive' : 'outline'}
                disabled={isSelf || deactivate.isPending || reactivate.isPending}
                onClick={() => setConfirmAction(user.isActive ? 'deactivate' : 'reactivate')}
              >
                {user.isActive ? <UserX className="size-4" /> : <RotateCcw className="size-4" />}
                {user.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => !nextOpen && setConfirmAction(null)}
        title={confirmAction === 'deactivate' ? 'Deactivate user?' : 'Reactivate user?'}
        description={
          confirmAction === 'deactivate'
            ? 'This prevents the user from signing in and revokes active sessions.'
            : 'This allows the user to sign in again with their existing credentials.'
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        variant={confirmAction === 'deactivate' ? 'destructive' : 'default'}
        onConfirm={handleActivationChange}
      />
    </>
  );
}
