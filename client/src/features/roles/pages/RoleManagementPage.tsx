import { useMemo, useState } from 'react';
import { ShieldPlus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { usersApi } from '@/api/endpoints/users.api';
import { societiesApi } from '@/api/endpoints/societies.api';
import { serversApi } from '@/api/endpoints/servers.api';
import { DEFAULT_PAGE_SIZE, queryKeys } from '@/lib/constants';
import { inputClassName, AdminPageHeader, DataState } from '@/features/admin/components/AdminDataPrimitives';
import { useAssignRole, useRevokeRole, useUserRoles } from '../hooks/useRoles';
import type { AssignRoleRequest, RevokeRoleRequest, RoleName, UserRole } from '@/types';
import { UserType } from '@/types';

const ROLE_OPTIONS: Array<{ value: RoleName; label: string; target: UserType | 'ANY' }> = [
  { value: 'hod', label: 'HOD', target: UserType.TEACHER },
  { value: 'program_director', label: 'Program Director', target: UserType.TEACHER },
  { value: 'cr', label: 'Class Representative', target: UserType.STUDENT },
  { value: 'society_president', label: 'Society President', target: UserType.STUDENT },
  { value: 'society_convenor', label: 'Society Convenor', target: UserType.TEACHER },
  { value: 'server_moderator', label: 'Server Moderator', target: 'ANY' },
  { value: 'channel_moderator', label: 'Channel Moderator', target: 'ANY' },
];

function canRevoke(role: UserRole): role is UserRole & { role: Exclude<RoleName, 'society_president' | 'society_convenor'> } {
  return role.role !== 'society_president' && role.role !== 'society_convenor';
}

function roleToRevokePayload(role: UserRole, userId: number): RevokeRoleRequest | null {
  if (!canRevoke(role)) return null;
  if (role.role === 'server_moderator' && role.serverId) {
    return { userId, role: 'server_moderator', serverId: role.serverId };
  }
  if (role.role === 'channel_moderator' && role.serverId && role.channelId) {
    return { userId, role: 'channel_moderator', serverId: role.serverId, channelId: role.channelId };
  }
  if (role.role !== 'hod' && role.role !== 'program_director' && role.role !== 'cr') {
    return null;
  }
  const scopeId = role.departmentId ?? role.programId ?? role.classId;
  return scopeId ? { userId, role: role.role, scopeId } : null;
}

export function RoleManagementPage() {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [role, setRole] = useState<RoleName>('server_moderator');
  const [scopeId, setScopeId] = useState('');
  const [serverId, setServerId] = useState('');
  const [channelId, setChannelId] = useState('');
  const selectedRole = ROLE_OPTIONS.find((option) => option.value === role) ?? ROLE_OPTIONS[0]!;
  const isModeratorRole = role === 'server_moderator' || role === 'channel_moderator';
  const selectedServerId = Number(serverId) || undefined;

  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: catalogApi.listDepartments,
  });
  const programsQuery = useQuery({
    queryKey: queryKeys.programs.list({ page: 1, limit: 50 }),
    queryFn: () => catalogApi.listPrograms({ page: 1, limit: 50 }),
  });
  const classesQuery = useQuery({
    queryKey: queryKeys.classes.list({ page: 1, limit: 50 }),
    queryFn: () => catalogApi.listClasses({ page: 1, limit: 50 }),
  });
  const societiesQuery = useQuery({
    queryKey: queryKeys.societies.list({ page: 1, limit: 50 }),
    queryFn: () => societiesApi.list({ page: 1, limit: 50 }),
  });
  const serversQuery = useQuery({
    queryKey: queryKeys.servers.list({ page: 1, limit: 50 }),
    queryFn: () => serversApi.list({ page: 1, limit: 50 }),
  });
  const channelsQuery = useQuery({
    queryKey: selectedServerId
      ? queryKeys.servers.channels(selectedServerId, { includeArchived: false })
      : ['servers', 'channels', 'idle'],
    queryFn: () => serversApi.listChannels(selectedServerId!, { includeArchived: false }),
    enabled: selectedServerId !== undefined && role === 'channel_moderator',
  });
  const serverMembersQuery = useQuery({
    queryKey: selectedServerId
      ? queryKeys.servers.members(selectedServerId, { page: 1, limit: 50 })
      : ['servers', 'members', 'idle'],
    queryFn: () => serversApi.listMembers(selectedServerId!, { page: 1, limit: 50 }),
    enabled: selectedServerId !== undefined && isModeratorRole,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({
      search,
      userType: selectedRole.target === 'ANY' ? undefined : selectedRole.target,
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
    }),
    queryFn: () =>
      usersApi.list({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: search.trim() || undefined,
        userType: selectedRole.target === 'ANY' ? undefined : selectedRole.target,
        isActive: true,
      }),
    enabled: !isModeratorRole,
  });
  const rolesQuery = useUserRoles(selectedUserId);
  const assignRole = useAssignRole();
  const revokeRole = useRevokeRole();

  const scopeOptions = useMemo(() => {
    if (role === 'hod') {
      return (departmentsQuery.data ?? []).map((department) => ({
        value: department.id,
        label: `${department.code} · ${department.name}`,
      }));
    }
    if (role === 'program_director') {
      return (programsQuery.data?.data ?? []).map((program) => ({
        value: program.id,
        label: `${program.code} · ${program.department.name}`,
      }));
    }
    if (role === 'cr') {
      return (classesQuery.data?.data ?? []).map((klass) => ({
        value: klass.id,
        label: `${klass.program.code}-${klass.currentSemester}${klass.section}`,
      }));
    }
    return (societiesQuery.data?.data ?? []).map((society) => ({
      value: society.id,
      label: society.name,
    }));
  }, [classesQuery.data?.data, departmentsQuery.data, programsQuery.data?.data, role, societiesQuery.data?.data]);

  const userOptions = isModeratorRole
    ? (serverMembersQuery.data?.data ?? []).map((member) => member.user)
    : (usersQuery.data?.data ?? []);

  function buildAssignPayload(): AssignRoleRequest | null {
    if (!selectedUserId) return null;
    if (role === 'server_moderator') {
      return selectedServerId ? { userId: selectedUserId, role, serverId: selectedServerId } : null;
    }
    if (role === 'channel_moderator') {
      return selectedServerId && Number(channelId)
        ? { userId: selectedUserId, role, serverId: selectedServerId, channelId: Number(channelId) }
        : null;
    }
    return Number(scopeId) ? { userId: selectedUserId, role, scopeId: Number(scopeId) } : null;
  }

  async function handleAssign() {
    const payload = buildAssignPayload();
    if (!payload) return;
    await assignRole.mutateAsync(payload);
  }

  return (
    <section className="space-y-5">
      <AdminPageHeader
        eyebrow="Roles"
        title="Role Management"
        description="Assign scoped academic, society, server, and channel roles."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border bg-background p-4">
          <h2 className="text-sm font-semibold">Assignment</h2>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Role</span>
            <select
              className={inputClassName}
              value={role}
              onChange={(event) => {
                setRole(event.target.value as RoleName);
                setScopeId('');
                setServerId('');
                setChannelId('');
                setSelectedUserId(null);
              }}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {isModeratorRole ? (
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Server</span>
              <select className={inputClassName} value={serverId} onChange={(event) => setServerId(event.target.value)}>
                <option value="">Select server</option>
                {(serversQuery.data?.data ?? []).map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} · {server.type}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Scope</span>
              <select className={inputClassName} value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                <option value="">Select scope</option>
                {scopeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {role === 'channel_moderator' ? (
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Channel</span>
              <select className={inputClassName} value={channelId} onChange={(event) => setChannelId(event.target.value)}>
                <option value="">Select channel</option>
                {(channelsQuery.data ?? []).map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!isModeratorRole ? (
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Search users</span>
              <input className={inputClassName} value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
          ) : null}
          <label className="space-y-1.5">
            <span className="text-sm font-medium">User</span>
            <select
              className={inputClassName}
              value={selectedUserId ?? ''}
              onChange={(event) => setSelectedUserId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Select user</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName} · {option.email}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" className="w-full" disabled={!buildAssignPayload() || assignRole.isPending} onClick={() => void handleAssign()}>
            <ShieldPlus className="size-4" />
            Assign role
          </Button>
        </aside>

        <section className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Current roles</h2>
            {selectedUserId ? <Badge variant="secondary">User #{selectedUserId}</Badge> : null}
          </div>
          {!selectedUserId ? (
            <EmptyState title="Select a user" description="Choose a user to inspect and revoke current roles." />
          ) : (
            <DataState
              isLoading={rolesQuery.isLoading}
              isError={rolesQuery.isError}
              onRetry={() => void rolesQuery.refetch()}
              empty={(rolesQuery.data ?? []).length === 0}
            >
              <div className="divide-y">
                {(rolesQuery.data ?? []).map((assignment, index) => {
                  const revokePayload = roleToRevokePayload(assignment, selectedUserId);
                  return (
                    <div key={`${assignment.role}-${index}`} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <RoleBadge role={assignment.role} />
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {assignment.scopeContext ?? assignment.serverName ?? assignment.societyName ?? assignment.programCode ?? assignment.departmentName ?? 'Scoped role'}
                        </p>
                      </div>
                      {revokePayload ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={revokeRole.isPending}
                          onClick={() => revokeRole.mutate(revokePayload)}
                        >
                          <Trash2 className="size-4" />
                          Revoke
                        </Button>
                      ) : (
                        <Badge variant="secondary">Change via society</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </DataState>
          )}
        </section>
      </div>
    </section>
  );
}
