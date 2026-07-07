import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileUp,
  Plus,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROUTES } from '@/lib/constants';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate } from '@/features/profile/utils';
import { UserStatus, UserType } from '@/types';
import type { UserListParams } from '@/types';
import { UserDetailDialog } from '../components/UserDetailDialog';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useDepartments } from '../hooks/useDepartments';
import {
  USER_PAGE_SIZE,
  parsePositiveInt,
  parseUserLifecycle,
  parseUserStatus,
  parseUserType,
} from '../utils';

export function AdminUserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUserPublicId, setSelectedUserPublicId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(searchValue.trim(), 300);
  const page = parsePositiveInt(searchParams.get('page')) ?? 1;
  const userType = parseUserType(searchParams.get('userType'));
  const departmentId = parsePositiveInt(searchParams.get('departmentId'));
  const status = parseUserStatus(searchParams.get('status'));
  const lifecycle = parseUserLifecycle(searchParams.get('lifecycle'));

  useEffect(() => {
    const currentSearch = searchParams.get('search') ?? '';
    if (debouncedSearch === currentSearch) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      next.set('search', debouncedSearch);
    } else {
      next.delete('search');
    }
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const params: UserListParams = useMemo(
    () => ({
      page,
      limit: USER_PAGE_SIZE,
      userType,
      departmentId,
      status,
      lifecycle,
      search: searchParams.get('search')?.trim() || undefined,
    }),
    [departmentId, lifecycle, page, searchParams, status, userType],
  );
  const usersQuery = useAdminUsers(params);
  const departmentsQuery = useDepartments();
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;

  function updateFilter(updates: {
    page?: number;
    userType?: string;
    departmentId?: string;
    status?: string;
    lifecycle?: string;
  }) {
    const next = new URLSearchParams(searchParams);

    if ('userType' in updates) {
      if (updates.userType) {
        next.set('userType', updates.userType);
      } else {
        next.delete('userType');
      }
      next.delete('page');
    }

    if ('departmentId' in updates) {
      if (updates.departmentId) {
        next.set('departmentId', updates.departmentId);
      } else {
        next.delete('departmentId');
      }
      next.delete('page');
    }

    if ('status' in updates) {
      if (updates.status) {
        next.set('status', updates.status);
      } else {
        next.delete('status');
      }
      next.delete('page');
    }

    if ('lifecycle' in updates) {
      if (updates.lifecycle) {
        next.set('lifecycle', updates.lifecycle);
      } else {
        next.delete('lifecycle');
      }
      next.delete('page');
    }

    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(updates.page));
      }
    }

    setSearchParams(next);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Users</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and manage UniConnect accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to={ROUTES.ADMIN_USERS_IMPORT} />}>
            <FileUp className="size-4" />
            Import
          </Button>
          <Button render={<Link to={ROUTES.ADMIN_USERS_NEW} />}>
            <Plus className="size-4" />
            New user
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(10rem,14rem))] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="user-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-search"
                className="pl-8"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Name or email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-type-filter">User type</Label>
            <select
              id="user-type-filter"
              value={userType ?? ''}
              onChange={(event) => updateFilter({ userType: event.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All types</option>
              <option value={UserType.STAFF}>Staff</option>
              <option value={UserType.TEACHER}>Teachers</option>
              <option value={UserType.STUDENT}>Students</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department-filter">Department</Label>
            <select
              id="department-filter"
              value={departmentId ?? ''}
              onChange={(event) => updateFilter({ departmentId: event.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-filter">Status</Label>
            <select
              id="status-filter"
              value={status ?? ''}
              onChange={(event) => updateFilter({ status: event.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All statuses</option>
              <option value={UserStatus.ACTIVE}>Active</option>
              <option value={UserStatus.SUSPENDED}>Suspended</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lifecycle-filter">Lifecycle</Label>
            <select
              id="lifecycle-filter"
              value={lifecycle ?? ''}
              onChange={(event) => updateFilter({ lifecycle: event.target.value })}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Live users</option>
              <option value="deleted">Deleted users</option>
              <option value="all">All users</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        {usersQuery.isLoading ? (
          <LoadingSpinner />
        ) : usersQuery.isError ? (
          <div className="py-10">
            <Button
              variant="outline"
              onClick={() => void usersQuery.refetch()}
              className="mx-auto flex"
            >
              <RotateCcw className="size-4" />
              Retry
            </Button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try adjusting the active filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.publicId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          fullName={user.fullName}
                          profilePictureUrl={user.profilePictureUrl}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.userType} />
                    </td>
                    <td className="px-4 py-3">
                      {user.departmentId
                        ? (departmentById.get(user.departmentId)?.code ?? user.departmentId)
                        : 'None'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === UserStatus.ACTIVE ? 'default' : 'destructive'}>
                        {user.isDeleted
                          ? 'Deleted'
                          : user.status === UserStatus.ACTIVE
                            ? 'Active'
                            : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserPublicId(user.publicId)}
                      >
                        <Eye className="size-4" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => updateFilter({ page: pagination.page - 1 })}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateFilter({ page: pagination.page + 1 })}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <UserDetailDialog
        userPublicId={selectedUserPublicId}
        departments={departments}
        open={selectedUserPublicId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setSelectedUserPublicId(null)}
      />
    </section>
  );
}
