import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Plus, UserMinus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { parseRouteParamId } from '@/lib/route-params';
import { parsePositiveInt } from '@/features/admin/utils';
import {
  AdminPageHeader,
  DataState,
  PaginationControls,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import {
  useAddSocietyMember,
  useReviewSocietyJoinRequest,
  useRemoveSocietyMember,
  useSociety,
  useSocietyJoinRequests,
  useSocietyMemberCandidates,
  useSocietyMembers,
  useSubmitSocietyJoinRequest,
  useUpdateSociety,
} from '../hooks/useSocieties';
import { SocietyEditDialog } from '../components/SocietyDialogs';
import {
  getSocietyDetailActionState,
  isSocietyTabAvailable,
  parseSocietyTab,
  type SocietyDetailTab,
} from '../utils';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function SocietyDetailPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const societyId = parseRouteParamId(params.societyId ?? params.id);
  const requestedTab = parseSocietyTab(searchParams.get('tab'));
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const societyQuery = useSociety(societyId);
  const society = societyQuery.data;
  const actions = getSocietyDetailActionState(society);
  const tab = isSocietyTabAvailable(requestedTab, actions.tabs) ? requestedTab : 'overview';

  const membersQuery = useSocietyMembers(
    societyId,
    { page, limit: DEFAULT_PAGE_SIZE },
    tab === 'members' && actions.canViewMembers,
  );
  const requestsQuery = useSocietyJoinRequests(
    societyId,
    { page, limit: DEFAULT_PAGE_SIZE, status: 'PENDING' },
    tab === 'requests' && actions.canViewJoinRequests,
  );
  const candidatesQuery = useSocietyMemberCandidates(
    societyId,
    { page: 1, limit: 20, search: candidateSearch.trim() || undefined },
    tab === 'members' && actions.canManageMembers,
  );
  const submitJoinRequest = useSubmitSocietyJoinRequest(societyId ?? 0);
  const reviewRequest = useReviewSocietyJoinRequest(societyId ?? 0);
  const addMember = useAddSocietyMember(societyId ?? 0);
  const removeMember = useRemoveSocietyMember(societyId ?? 0);
  const updateSociety = useUpdateSociety(societyId ?? 0);

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
      presidentId: society.president.user.id,
      presidentName: society.president.user.fullName,
      convenorId: society.convenor.user.id,
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

  if (societyId === null) {
    return <EmptyState title="Society not found" description="The society route is invalid." />;
  }

  const members = membersQuery.data?.data ?? [];
  const requests = requestsQuery.data?.data ?? [];
  const candidates = candidatesQuery.data?.data ?? [];

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
          </>
        }
      />
      <DataState
        isLoading={societyQuery.isLoading}
        isError={societyQuery.isError}
        onRetry={() => void societyQuery.refetch()}
        empty={!society}
      >
        <div className="flex flex-wrap gap-2 border-b">
          {actions.tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`px-3 py-2 text-sm capitalize ${tab === item ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
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
        ) : null}

        {tab === 'members' && actions.canViewMembers ? (
          <div className="space-y-4">
            {actions.canManageMembers ? (
              <div className="rounded-lg border bg-background p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    className={inputClassName}
                    placeholder="Search students"
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                  />
                  <select
                    className={inputClassName}
                    value={selectedCandidateId}
                    onChange={(event) => setSelectedCandidateId(event.target.value)}
                  >
                    <option value="">
                      {candidatesQuery.isLoading ? 'Loading students...' : 'Select student'}
                    </option>
                    {candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.fullName} · {candidate.email}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    disabled={!selectedCandidateId || addMember.isPending}
                    onClick={() => {
                      void addMember.mutateAsync(Number(selectedCandidateId));
                      setSelectedCandidateId('');
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
            >
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="divide-y">
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.user.profilePictureUrl ?? undefined} />
                          <AvatarFallback>{initials(member.user.fullName)}</AvatarFallback>
                        </Avatar>
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
                          onClick={() => removeMember.mutate(member.userId)}
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
            <PaginationControls pagination={membersQuery.data?.pagination} onPageChange={setPage} />
          </div>
        ) : null}

        {tab === 'requests' && actions.canViewJoinRequests ? (
          <div className="space-y-4">
            <DataState
              isLoading={requestsQuery.isLoading}
              isError={requestsQuery.isError}
              onRetry={() => void requestsQuery.refetch()}
              empty={requests.length === 0}
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
        ) : null}
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
    </section>
  );
}
