import { useState } from 'react';
import { toast } from 'sonner';
import { Mail, Phone, RotateCcw, Trash2, UserCheck, UserX } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
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
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/features/auth/utils';
import { formatDate } from '@/features/profile/utils';
import { useAuthStore } from '@/stores/auth.store';
import { UserStatus, type DepartmentListItem } from '@/types';
import {
  useDeleteUser,
  useRestoreUser,
  useUpdateUserStatus,
  useUserDeletionImpact,
} from '../hooks/useUserActivation';
import { useUserDetail } from '../hooks/useUserDetail';

interface UserDetailDialogProps {
  userPublicId: string | null;
  departments: DepartmentListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LifecycleAction = 'suspend' | 'activate' | 'delete' | 'restore';

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
  userPublicId,
  departments,
  open,
  onOpenChange,
}: UserDetailDialogProps) {
  const [confirmAction, setConfirmAction] = useState<LifecycleAction | null>(null);
  const [reason, setReason] = useState('');
  const currentUser = useAuthStore((state) => state.user);
  const detailQuery = useUserDetail(userPublicId, open);
  const deletionImpact = useUserDeletionImpact(
    userPublicId,
    open && confirmAction === 'delete',
  );
  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();
  const restoreUser = useRestoreUser();
  const user = detailQuery.data;
  const department = departments.find((item) => item.id === user?.departmentId);
  const isSelf = currentUser?.publicId === user?.publicId;
  const mutationPending = updateStatus.isPending || deleteUser.isPending || restoreUser.isPending;
  const impact = deletionImpact.data;
  const blockerCount = impact
    ? Object.values(impact.blockers).reduce((count, blockers) => count + blockers.length, 0)
    : 0;

  function openConfirm(action: LifecycleAction) {
    setReason('');
    setConfirmAction(action);
  }

  async function handleActivationChange() {
    if (!user || !confirmAction) {
      return;
    }

    const payload = { reason: reason.trim() || undefined };

    try {
      if (confirmAction === 'suspend') {
        await updateStatus.mutateAsync({
          userPublicId: user.publicId,
          payload: { ...payload, status: UserStatus.SUSPENDED },
        });
        toast.success('User suspended.');
      } else if (confirmAction === 'activate') {
        await updateStatus.mutateAsync({
          userPublicId: user.publicId,
          payload: { ...payload, status: UserStatus.ACTIVE },
        });
        toast.success('User activated.');
      } else if (confirmAction === 'delete') {
        await deleteUser.mutateAsync({ userPublicId: user.publicId, payload });
        toast.success('User deleted.');
      } else {
        await restoreUser.mutateAsync({ userPublicId: user.publicId, payload });
        toast.success('User restored.');
      }
      setConfirmAction(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update user lifecycle.'));
    }
  }

  const confirmTitle =
    confirmAction === 'suspend'
      ? 'Suspend user?'
      : confirmAction === 'activate'
        ? 'Activate user?'
        : confirmAction === 'delete'
          ? 'Delete user?'
          : 'Restore user?';
  const confirmLabel =
    confirmAction === 'suspend'
      ? 'Suspend'
      : confirmAction === 'activate'
        ? 'Activate'
        : confirmAction === 'delete'
          ? 'Delete'
          : 'Restore';
  const confirmDescription =
    confirmAction === 'suspend'
      ? 'This prevents sign-in, refresh, and realtime connections.'
      : confirmAction === 'activate'
        ? 'This allows the user to sign in again.'
        : confirmAction === 'delete'
          ? 'This hides the user from normal workflows and removes active sessions, notifications, and pending society requests.'
          : 'This restores the user if their email has not been reused.';

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
                <UserAvatar
                  fullName={user.fullName}
                  profilePictureUrl={user.profilePictureUrl}
                  className="size-20 text-xl"
                  fallbackClassName="text-xl"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h2 className="break-words text-xl font-semibold">{user.fullName}</h2>
                    <p className="text-sm text-muted-foreground">
                      Joined {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RoleBadge role={user.userType} />
                    <Badge variant={user.status === UserStatus.ACTIVE ? 'default' : 'destructive'}>
                      {user.isDeleted
                        ? 'Deleted'
                        : user.status === UserStatus.ACTIVE
                          ? 'Active'
                          : 'Suspended'}
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
                    <DetailField label="Class public ID" value={user.studentInfo.classPublicId} />
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
            <DialogFooter className="gap-2 sm:justify-between">
              {user.isDeleted ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSelf || mutationPending}
                  onClick={() => openConfirm('restore')}
                >
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={user.status === UserStatus.ACTIVE ? 'destructive' : 'outline'}
                    disabled={isSelf || mutationPending}
                    onClick={() =>
                      openConfirm(user.status === UserStatus.ACTIVE ? 'suspend' : 'activate')
                    }
                  >
                    {user.status === UserStatus.ACTIVE ? (
                      <UserX className="size-4" />
                    ) : (
                      <UserCheck className="size-4" />
                    )}
                    {user.status === UserStatus.ACTIVE ? 'Suspend' : 'Activate'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSelf || mutationPending}
                    onClick={() => openConfirm('delete')}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              )}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConfirmAction(null);
            setReason('');
          }
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        variant={confirmAction === 'suspend' || confirmAction === 'delete' ? 'destructive' : 'default'}
        confirmDisabled={confirmAction === 'delete' && (!impact || !impact.canDelete)}
        onConfirm={handleActivationChange}
      >
        <div className="space-y-3">
          {confirmAction === 'delete' ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {deletionImpact.isLoading ? (
                <p className="text-muted-foreground">Checking deletion impact...</p>
              ) : deletionImpact.isError ? (
                <p className="text-destructive">Unable to check deletion impact.</p>
              ) : impact?.canDelete ? (
                <p>No blocking assignments found.</p>
              ) : (
                <p className="text-destructive">
                  Resolve {blockerCount} blocking assignment{blockerCount === 1 ? '' : 's'} before
                  deletion.
                </p>
              )}
            </div>
          ) : null}
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="Reason (optional)"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
