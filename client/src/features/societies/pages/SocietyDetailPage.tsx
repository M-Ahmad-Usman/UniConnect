import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Plus, RotateCcw, Trash2, UserCheck, UserMinus, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { parseRouteParamPublicId } from '@/lib/route-params';
import { getApiErrorMessage } from '@/features/auth/utils';
import { SocietyStatus } from '@/types';
import { parsePositiveInt } from '@/features/admin/utils';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import {
  useAddSocietyMember,
  useDeleteSociety,
  useReviewSocietyJoinRequest,
  useRemoveSocietyMember,
  useRestoreSociety,
  useSociety,
  useSocietyDeletionImpact,
  useSocietyJoinRequests,
  useSocietyLeadershipConflicts,
  useSocietyMemberCandidates,
  useSocietyMembers,
  useSubmitSocietyJoinRequest,
  useUpdateSocietyStatus,
  useUpdateSociety,
} from '../hooks/useSocieties';
import { SocietyEditDialog } from '../components/SocietyDialogs';
import {
  getSocietyDetailActionState,
  isSocietyTabAvailable,
  parseSocietyTab,
  type SocietyDetailTab,
} from '../utils';

type LifecycleAction = 'suspend' | 'activate' | 'delete' | 'restore';

export function SocietyDetailPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const societyPublicId = parseRouteParamPublicId(params.societyId ?? params.id);
  const requestedTab = parseSocietyTab(searchParams.get('tab'));
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidatePublicId, setSelectedCandidatePublicId] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [removingMemberPublicId, setRemovingMemberPublicId] = useState<string | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');

  const societyQuery = useSociety(societyPublicId);
  const society = societyQuery.data;
  const actions = getSocietyDetailActionState(society);
  const tab = isSocietyTabAvailable(requestedTab, actions.tabs) ? requestedTab : 'overview';

  const membersQuery = useSocietyMembers(
    societyPublicId,
    { page, limit: DEFAULT_PAGE_SIZE },
    tab === 'members' && actions.canViewMembers,
  );
  const requestsQuery = useSocietyJoinRequests(
    societyPublicId,
    { page, limit: DEFAULT_PAGE_SIZE, status: 'PENDING' },
    tab === 'requests' && actions.canViewJoinRequests,
  );
  const candidatesQuery = useSocietyMemberCandidates(
    societyPublicId,
    { page: 1, limit: 20, search: candidateSearch.trim() || undefined },
    tab === 'members' && actions.canManageMembers,
  );
  const stableSocietyPublicId = societyPublicId ?? '';
  const submitJoinRequest = useSubmitSocietyJoinRequest(stableSocietyPublicId);
  const reviewRequest = useReviewSocietyJoinRequest(stableSocietyPublicId);
  const addMember = useAddSocietyMember(stableSocietyPublicId);
  const removeMember = useRemoveSocietyMember(stableSocietyPublicId);
  const updateSociety = useUpdateSociety(stableSocietyPublicId);
  const updateSocietyStatus = useUpdateSocietyStatus(stableSocietyPublicId);
  const deleteSociety = useDeleteSociety(stableSocietyPublicId);
  const restoreSociety = useRestoreSociety(stableSocietyPublicId);
  const leadershipConflictAction =
    lifecycleAction === 'activate' || lifecycleAction === 'restore' ? lifecycleAction : null;
  const leadershipConflicts = useSocietyLeadershipConflicts(
    societyPublicId,
    leadershipConflictAction,
    lifecycleAction === 'activate' || lifecycleAction === 'restore',
  );
  const deletionImpact = useSocietyDeletionImpact(
    societyPublicId,
    lifecycleAction === 'delete',
  );

  useEffect(() => {
    if (!society || requestedTab === tab) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, society, requestedTab, tab]);

  const editInitialValues = useMemo(() => {
    if (!society) return null;

    return {
      name: society.name,
      description: society.description ?? '',
      presidentPublicId: society.president.user.publicId,
      presidentName: society.president.user.fullName,
      convenorPublicId: society.convenor.user.publicId,
      convenorName: society.convenor.user.fullName,
    };
  }, [society]);

  function setTab(nextTab: SocietyDetailTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    next.set('page', '1');
    setSearchParams(next);
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  async function handleLifecycleAction() {
    if (!lifecycleAction) return;
    const payload = { reason: lifecycleReason.trim() || undefined };
    try {
      if (lifecycleAction === 'suspend') {
        await updateSocietyStatus.mutateAsync({ ...payload, status: SocietyStatus.SUSPENDED });
      } else if (lifecycleAction === 'activate') {
        await updateSocietyStatus.mutateAsync({ ...payload, status: SocietyStatus.ACTIVE });
      } else if (lifecycleAction === 'delete') {
        await deleteSociety.mutateAsync(payload);
      } else {
        await restoreSociety.mutateAsync(payload);
      }
      toast.success(
        lifecycleAction === 'suspend'
          ? 'Society suspended successfully.'
          : lifecycleAction === 'activate'
            ? 'Society activated successfully.'
            : lifecycleAction === 'delete'
              ? 'Society deleted successfully.'
              : 'Society restored successfully.',
      );
      setLifecycleAction(null);
      setLifecycleReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update society lifecycle.'));
    }
  }

  if (societyPublicId === null) {
    return <EmptyState title="Society not found" description="The society route is invalid." />;
  }

  const members = membersQuery.data?.data ?? [];
  const requests = requestsQuery.data?.data ?? [];
  const candidates = candidatesQuery.data?.data ?? [];
  const removingMember =
    members.find((member) => member.user.publicId === removingMemberPublicId) ?? null;
  const lifecycleLeadershipConflicts = leadershipConflicts.data?.conflicts ?? [];
  const lifecyclePending =
    updateSocietyStatus.isPending || deleteSociety.isPending || restoreSociety.isPending;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Societies"
        title={society?.name ?? 'Society'}
        description={society?.department.name}
        actions={
          <>
            {society &&
            (actions.canSubmitJoinRequest || society.viewer.requestStatus === 'PENDING') ? (
              <Button
                type="button"
                disabled={submitJoinRequest.isPending || society.viewer.requestStatus === 'PENDING'}
                onClick={() => submitJoinRequest.mutate()}
              >
                {society.viewer.requestStatus === 'PENDING' ? 'Request sent' : 'Request to join'}
              </Button>
            ) : null}
            {society && (actions.canEditInfo || actions.canChangeLeadership) ? (
              <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit society
              </Button>
            ) : null}
            {society && actions.canManageLifecycle ? (
              <>
                {!society.isDeleted && society.status === SocietyStatus.ACTIVE ? (
                  <Button type="button" variant="outline" onClick={() => setLifecycleAction('suspend')}>
                    <UserX className="size-4" />
                    Suspend
                  </Button>
                ) : null}
                {!society.isDeleted && society.status === SocietyStatus.SUSPENDED ? (
                  <Button type="button" variant="outline" onClick={() => setLifecycleAction('activate')}>
                    <UserCheck className="size-4" />
                    Activate
                  </Button>
                ) : null}
                {!society.isDeleted ? (
                  <Button type="button" variant="destructive" onClick={() => setLifecycleAction('delete')}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setLifecycleAction('restore')}>
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                )}
              </>
            ) : null}
          </>
        }
      />
      <DataState
        isLoading={societyQuery.isLoading}
        isError={societyQuery.isError}
        onRetry={() => void societyQuery.refetch()}
        empty={!society}
      >
        {society && (society.isDeleted || society.status === SocietyStatus.SUSPENDED) ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <Badge variant="outline">{society.isDeleted ? 'Deleted' : 'Suspended'}</Badge>
            <p className="mt-2">
              {society.isDeleted
                ? 'This society is deleted. Restore it to make the workspace available again.'
                : 'This society is read-only while suspended.'}
            </p>
          </div>
        ) : null}
        <Tabs
          value={tab}
          onValueChange={(value) => {
            if (isSocietyTabAvailable(value as SocietyDetailTab, actions.tabs)) {
              setTab(value as SocietyDetailTab);
            }
          }}
        >
          <TabsList aria-label="Society detail sections">
            {actions.tabs.map((item) => (
              <TabsTrigger key={item} value={item} className="capitalize">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                <h2 className="font-semibold">Overview</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {society?.description || 'No description provided.'}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h2 className="font-semibold">Leadership</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">President</dt>
                    <dd className="font-medium">{society?.president.user.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Convenor</dt>
                    <dd className="font-medium">{society?.convenor.user.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Members</dt>
                    <dd className="font-medium">{society?.server._count.memberships ?? 0}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>

          {actions.canViewMembers ? (
            <TabsContent value="members">
              <div className="space-y-4">
                {actions.canManageMembers ? (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <label className="space-y-1.5">
                        <span className="text-sm font-medium">Search students</span>
                        <input
                          className={inputClassName}
                          placeholder="Name or email"
                          value={candidateSearch}
                          onChange={(event) => setCandidateSearch(event.target.value)}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-sm font-medium">Eligible student</span>
                        <select
                          className={inputClassName}
                          value={selectedCandidatePublicId}
                          onChange={(event) => setSelectedCandidatePublicId(event.target.value)}
                        >
                          <option value="">
                            {candidatesQuery.isLoading ? 'Loading students...' : 'Select student'}
                          </option>
                          {candidates.map((candidate) => (
                            <option key={candidate.publicId} value={candidate.publicId}>
                              {candidate.fullName} · {candidate.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        className="self-end"
                        disabled={!selectedCandidatePublicId || addMember.isPending}
                        onClick={() => {
                          void addMember.mutateAsync(selectedCandidatePublicId);
                          setSelectedCandidatePublicId('');
                        }}
                      >
                        <Plus className="size-4" />
                        Add member
                      </Button>
                    </div>
                  </div>
                ) : null}
                <DataState
                  isLoading={membersQuery.isLoading}
                  isError={membersQuery.isError}
                  onRetry={() => void membersQuery.refetch()}
                  empty={members.length === 0}
                  emptyTitle="No members found"
                  emptyDescription="This society has no visible ordinary members yet."
                >
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="divide-y">
                      {members.map((member) => (
                        <div
                          key={member.user.publicId}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              fullName={member.user.fullName}
                              profilePictureUrl={member.user.profilePictureUrl}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{member.user.fullName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {member.user.email}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {member.badges.map((badge) => (
                                  <RoleBadge key={badge} role={badge} />
                                ))}
                              </div>
                            </div>
                          </div>
                          {actions.canManageMembers &&
                          !member.badges.includes('president') &&
                          !member.badges.includes('convenor') ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={removeMember.isPending}
                              onClick={() => setRemovingMemberPublicId(member.user.publicId)}
                            >
                              <UserMinus className="size-4" />
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </DataState>
                <PaginationControls
                  pagination={membersQuery.data?.pagination}
                  onPageChange={setPage}
                />
              </div>
            </TabsContent>
          ) : null}

          {actions.canViewJoinRequests ? (
            <TabsContent value="requests">
              <div className="space-y-4">
                <DataState
                  isLoading={requestsQuery.isLoading}
                  isError={requestsQuery.isError}
                  onRetry={() => void requestsQuery.refetch()}
                  empty={requests.length === 0}
                  emptyTitle="No pending requests"
                  emptyDescription="New join requests will appear here."
                >
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="divide-y">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{request.user.fullName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {request.user.email}
                            </p>
                          </div>
                          {actions.canReviewJoinRequests ? (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={reviewRequest.isPending}
                                onClick={() =>
                                  reviewRequest.mutate({
                                    requestId: request.id,
                                    status: 'APPROVED',
                                  })
                                }
                              >
                                <Check className="size-4" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={reviewRequest.isPending}
                                onClick={() =>
                                  reviewRequest.mutate({
                                    requestId: request.id,
                                    status: 'REJECTED',
                                  })
                                }
                              >
                                <X className="size-4" />
                                Reject
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </DataState>
                <PaginationControls
                  pagination={requestsQuery.data?.pagination}
                  onPageChange={setPage}
                />
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </DataState>
      {society && editInitialValues ? (
        <SocietyEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          departmentId={society.departmentId}
          initialValues={editInitialValues}
          canChangeLeadership={actions.canChangeLeadership}
          loading={updateSociety.isPending}
          onSubmit={async (values) => {
            await updateSociety.mutateAsync(values);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={removingMemberPublicId !== null}
        onOpenChange={(open) => !open && setRemovingMemberPublicId(null)}
        title="Remove society member"
        description={
          removingMember
            ? `Remove ${removingMember.user.fullName} from this society? They will lose society member access.`
            : 'Remove this member from the society? They will lose society member access.'
        }
        confirmLabel="Remove member"
        variant="destructive"
        onConfirm={async () => {
          if (removingMemberPublicId === null) return;
          await removeMember.mutateAsync(removingMemberPublicId);
        }}
      />
      <ConfirmDialog
        open={lifecycleAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLifecycleAction(null);
            setLifecycleReason('');
          }
        }}
        title={`${lifecycleAction ?? 'Update'} society?`}
        description="Lifecycle changes affect the society workspace and its members."
        confirmLabel={lifecycleAction ?? 'Confirm'}
        variant={lifecycleAction === 'delete' ? 'destructive' : 'default'}
        confirmDisabled={
          lifecyclePending ||
          leadershipConflicts.isLoading ||
          lifecycleLeadershipConflicts.length > 0 ||
          (lifecycleAction === 'delete' && deletionImpact.data?.canDelete === false)
        }
        onConfirm={handleLifecycleAction}
      >
        <div className="space-y-3">
          {lifecycleAction === 'activate' || lifecycleAction === 'restore' ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Leadership availability</p>
              {leadershipConflicts.isLoading ? (
                <p className="mt-1 text-muted-foreground">Checking current assignments...</p>
              ) : lifecycleLeadershipConflicts.length > 0 ? (
                <div className="mt-2 space-y-2 text-destructive">
                  {lifecycleLeadershipConflicts.map((conflict) => (
                    <p key={`${conflict.role}-${conflict.userPublicId}`}>
                      {conflict.fullName} is already active as {conflict.role} of{' '}
                      {conflict.conflictingSocietyName}. Change leadership before continuing.
                    </p>
                  ))}
                </div>
              ) : leadershipConflicts.isError ? (
                <p className="mt-1 text-muted-foreground">
                  Availability could not be checked now. The server will recheck before applying changes.
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">No active leadership conflicts found.</p>
              )}
            </div>
          ) : null}
          {lifecycleAction === 'delete' && deletionImpact.data ? (
            <dl className="grid grid-cols-2 gap-2 rounded-lg border p-3 text-sm">
              <div><dt className="text-muted-foreground">Active members</dt><dd>{deletionImpact.data.activeMemberCount}</dd></div>
              <div><dt className="text-muted-foreground">Channels</dt><dd>{deletionImpact.data.liveChannelCount}</dd></div>
              <div><dt className="text-muted-foreground">Pending requests removed</dt><dd>{deletionImpact.data.pendingRequestCount}</dd></div>
              <div><dt className="text-muted-foreground">Posts preserved</dt><dd>{deletionImpact.data.preservedPostCount}</dd></div>
              <div><dt className="text-muted-foreground">Role assignments preserved</dt><dd>{deletionImpact.data.preservedPlatformRoleAssignmentCount}</dd></div>
            </dl>
          ) : null}
          <Textarea
            placeholder="Reason (optional)"
            value={lifecycleReason}
            onChange={(event) => setLifecycleReason(event.target.value)}
            maxLength={500}
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}
