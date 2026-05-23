import { useState } from 'react';
import { ShieldPlus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import {
  AdminPageHeader,
  DataState,
  inputClassName,
} from '@/features/admin/components/AdminDataPrimitives';
import type { AssignableRoleName, RevokeRoleRequest, RoleScopeOption } from '@/types';
import {
  useAssignableChannels,
  useAssignableRoles,
  useAssignableRoleScopes,
  useAssignableRoleUsers,
  useAssignRole,
  useRevokableRoleAssignments,
  useRevokeRole,
} from '../hooks/useRoles';
import { buildAssignPayload, chooseInitialRole, isModeratorRole } from '../utils';

function parseId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getScopeServerId(scope: RoleScopeOption | undefined, role: AssignableRoleName | null) {
  if (!scope || !role || !isModeratorRole(role)) {
    return null;
  }

  return scope.serverId ?? scope.id;
}

export function RoleManagementPage() {
  const permissionsQuery = useMyPermissions();
  const canOpenRoleManagement = permissionsQuery.data?.roleWorkspace.canOpenRoleManagement ?? false;
  const assignableRolesQuery = useAssignableRoles(canOpenRoleManagement);
  const [role, setRole] = useState<AssignableRoleName | null>(null);
  const [scopeId, setScopeId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [scopeSearch, setScopeSearch] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [revokableSearch, setRevokableSearch] = useState('');
  const [revokingAssignment, setRevokingAssignment] = useState<{
    label: string;
    payload: RevokeRoleRequest;
  } | null>(null);
  const debouncedScopeSearch = useDebouncedValue(scopeSearch.trim(), 300);
  const debouncedChannelSearch = useDebouncedValue(channelSearch.trim(), 300);
  const debouncedUserSearch = useDebouncedValue(userSearch.trim(), 300);
  const debouncedRevokableSearch = useDebouncedValue(revokableSearch.trim(), 300);
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();

  const roleOptions = assignableRolesQuery.data ?? [];
  const effectiveRole =
    role && roleOptions.some((option) => option.role === role)
      ? role
      : chooseInitialRole(roleOptions);
  const selectedRole = roleOptions.find((option) => option.role === effectiveRole) ?? null;
  const roleIsModerator = effectiveRole ? isModeratorRole(effectiveRole) : false;

  const scopesQuery = useAssignableRoleScopes(
    effectiveRole
      ? {
          role: effectiveRole,
          page: 1,
          limit: DEFAULT_PAGE_SIZE,
          search: debouncedScopeSearch || undefined,
        }
      : null,
  );
  const scopes = scopesQuery.data?.data ?? [];
  const selectedScope = scopes.find((scope) => String(scope.id) === scopeId);
  const selectedServerId = getScopeServerId(selectedScope, effectiveRole);
  const selectedChannelId = parseId(channelId);
  const usersEnabled = Boolean(
    effectiveRole &&
    selectedRole &&
    selectedUserQueryReady(effectiveRole, parseId(scopeId), selectedServerId, selectedChannelId),
  );

  const channelsQuery = useAssignableChannels(
    effectiveRole === 'channel_moderator' && selectedServerId
      ? {
          serverId: selectedServerId,
          page: 1,
          limit: DEFAULT_PAGE_SIZE,
          search: debouncedChannelSearch || undefined,
        }
      : null,
  );

  const usersQuery = useAssignableRoleUsers(
    effectiveRole && selectedRole && usersEnabled
      ? {
          role: effectiveRole,
          scopeId: roleIsModerator ? undefined : (parseId(scopeId) ?? undefined),
          serverId: roleIsModerator ? (selectedServerId ?? undefined) : undefined,
          channelId:
            effectiveRole === 'channel_moderator' ? (selectedChannelId ?? undefined) : undefined,
          page: 1,
          limit: DEFAULT_PAGE_SIZE,
          search: debouncedUserSearch || undefined,
        }
      : null,
  );

  const revokableQuery = useRevokableRoleAssignments(
    effectiveRole
      ? {
          role: effectiveRole,
          scopeId: !roleIsModerator ? (parseId(scopeId) ?? undefined) : undefined,
          serverId: roleIsModerator ? (selectedServerId ?? undefined) : undefined,
          channelId:
            effectiveRole === 'channel_moderator' ? (selectedChannelId ?? undefined) : undefined,
          page: 1,
          limit: DEFAULT_PAGE_SIZE,
          search: debouncedRevokableSearch || undefined,
        }
      : null,
  );

  const assignPayload = effectiveRole
    ? buildAssignPayload({
        role: effectiveRole,
        userId: selectedUserId,
        scopeId: parseId(scopeId),
        serverId: selectedServerId,
        channelId: selectedChannelId,
      })
    : null;
  const roleNeedsScope = effectiveRole !== null && !roleIsModerator;
  const userDisabledReason = !effectiveRole
    ? 'Choose a role before searching users.'
    : roleNeedsScope && !scopeId
      ? 'Choose a scope before searching users.'
      : effectiveRole === 'server_moderator' && !selectedServerId
        ? 'Choose a server before searching users.'
        : effectiveRole === 'channel_moderator' && !selectedChannelId
          ? 'Choose a channel before searching users.'
          : null;

  function resetDependents() {
    setScopeId('');
    setChannelId('');
    setSelectedUserId(null);
    setScopeSearch('');
    setChannelSearch('');
    setUserSearch('');
    setRevokableSearch('');
  }

  if (permissionsQuery.isLoading) {
    return (
      <section className="space-y-5">
        <AdminPageHeader eyebrow="Roles" title="Role Management" />
        <EmptyState
          title="Loading role permissions"
          description="Checking your available role actions."
        />
      </section>
    );
  }

  if (!canOpenRoleManagement) {
    return (
      <section className="space-y-5">
        <AdminPageHeader
          eyebrow="Roles"
          title="Role Management"
          description="Assign scoped academic, server, and channel roles."
        />
        <EmptyState
          title="Role management unavailable"
          description="Your account does not currently have role-management actions."
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Roles"
        title="Role Management"
        description="Assign scoped academic, server, and channel roles."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border bg-background p-4">
          <h2 className="text-sm font-semibold">Assignment</h2>
          <DataState
            isLoading={assignableRolesQuery.isLoading}
            isError={assignableRolesQuery.isError}
            onRetry={() => void assignableRolesQuery.refetch()}
            empty={roleOptions.length === 0}
          >
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Role</span>
              <select
                className={inputClassName}
                value={effectiveRole ?? ''}
                onChange={(event) => {
                  setRole(event.target.value as AssignableRoleName);
                  resetDependents();
                }}
              >
                {roleOptions.map((option) => (
                  <option key={option.role} value={option.role}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{roleIsModerator ? 'Server' : 'Scope'}</span>
              <input
                className={inputClassName}
                placeholder={roleIsModerator ? 'Search servers' : 'Search scopes'}
                value={scopeSearch}
                onChange={(event) => setScopeSearch(event.target.value)}
              />
              <select
                className={inputClassName}
                value={scopeId}
                onChange={(event) => {
                  setScopeId(event.target.value);
                  setChannelId('');
                  setSelectedUserId(null);
                }}
              >
                <option value="">{scopesQuery.isLoading ? 'Loading...' : 'Select scope'}</option>
                {scopes.map((scope) => (
                  <option key={scope.id} value={scope.id} disabled={scope.disabled}>
                    {scope.label}
                    {scope.disabled && scope.disabledReason ? ` (${scope.disabledReason})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {effectiveRole === 'channel_moderator' ? (
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Channel</span>
                <input
                  className={inputClassName}
                  placeholder="Search channels"
                  value={channelSearch}
                  onChange={(event) => setChannelSearch(event.target.value)}
                  disabled={!selectedServerId}
                  aria-describedby={!selectedServerId ? 'role-channel-help' : undefined}
                />
                <select
                  className={inputClassName}
                  value={channelId}
                  onChange={(event) => {
                    setChannelId(event.target.value);
                    setSelectedUserId(null);
                  }}
                  disabled={!selectedServerId}
                  aria-describedby={!selectedServerId ? 'role-channel-help' : undefined}
                >
                  <option value="">
                    {channelsQuery.isLoading ? 'Loading...' : 'Select channel'}
                  </option>
                  {(channelsQuery.data?.data ?? []).map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.label}
                      {channel.isLocked ? ' · locked' : ''}
                    </option>
                  ))}
                </select>
                {!selectedServerId ? (
                  <span id="role-channel-help" className="block text-xs text-muted-foreground">
                    Choose a server before selecting a channel.
                  </span>
                ) : null}
              </label>
            ) : null}
            <label className="space-y-1.5">
              <span className="text-sm font-medium">User</span>
              <input
                className={inputClassName}
                placeholder="Search users"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                disabled={!usersEnabled}
                aria-describedby={userDisabledReason ? 'role-user-help' : undefined}
              />
              <select
                className={inputClassName}
                value={selectedUserId ?? ''}
                onChange={(event) =>
                  setSelectedUserId(event.target.value ? Number(event.target.value) : null)
                }
                disabled={!usersEnabled}
                aria-describedby={userDisabledReason ? 'role-user-help' : undefined}
              >
                <option value="">{usersQuery.isLoading ? 'Loading...' : 'Select user'}</option>
                {(usersQuery.data?.data ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.fullName} · {option.email}
                  </option>
                ))}
              </select>
              {userDisabledReason ? (
                <span id="role-user-help" className="block text-xs text-muted-foreground">
                  {userDisabledReason}
                </span>
              ) : null}
            </label>
            <Button
              type="button"
              className="w-full"
              disabled={!assignPayload || assignRole.isPending}
              onClick={() => {
                if (assignPayload) void assignRole.mutateAsync(assignPayload);
              }}
            >
              <ShieldPlus className="size-4" />
              Assign role
            </Button>
          </DataState>
        </aside>

        <section className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Revokable assignments</h2>
            {selectedRole ? <Badge variant="secondary">{selectedRole.label}</Badge> : null}
          </div>
          <label className="mb-3 block space-y-1.5">
            <span className="text-sm font-medium">Search assignments</span>
            <input
              className={inputClassName}
              value={revokableSearch}
              onChange={(event) => setRevokableSearch(event.target.value)}
            />
          </label>
          <DataState
            isLoading={revokableQuery.isLoading}
            isError={revokableQuery.isError}
            onRetry={() => void revokableQuery.refetch()}
            empty={(revokableQuery.data?.data ?? []).length === 0}
            emptyTitle="No revokable assignments"
            emptyDescription="Assignments matching the selected role and scope will appear here."
          >
            <div className="divide-y">
              {(revokableQuery.data?.data ?? []).map((assignment) => (
                <div
                  key={assignment.assignmentKey}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <RoleBadge role={assignment.role} />
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {assignment.user.fullName} ·{' '}
                      {assignment.scope?.label ??
                        assignment.channel?.label ??
                        assignment.server?.label ??
                        'Scoped role'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revokeRole.isPending}
                    onClick={() =>
                      setRevokingAssignment({
                        label: `${assignment.user.fullName} · ${
                          assignment.scope?.label ??
                          assignment.channel?.label ??
                          assignment.server?.label ??
                          'Scoped role'
                        }`,
                        payload: assignment.revokePayload,
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </DataState>
        </section>
      </div>
      <ConfirmDialog
        open={revokingAssignment !== null}
        onOpenChange={(open) => !open && setRevokingAssignment(null)}
        title="Revoke role assignment"
        description={
          revokingAssignment
            ? `Revoke this role from ${revokingAssignment.label}? Their permissions update immediately.`
            : 'Revoke this role assignment? Permissions update immediately.'
        }
        confirmLabel="Revoke role"
        variant="destructive"
        onConfirm={async () => {
          if (!revokingAssignment) return;
          await revokeRole.mutateAsync(revokingAssignment.payload);
        }}
      />
    </section>
  );
}

function selectedUserQueryReady(
  role: AssignableRoleName,
  scopeId: number | null,
  serverId: number | null,
  channelId: number | null,
) {
  if (role === 'server_moderator') {
    return serverId !== null;
  }
  if (role === 'channel_moderator') {
    return serverId !== null && channelId !== null;
  }
  return scopeId !== null;
}
