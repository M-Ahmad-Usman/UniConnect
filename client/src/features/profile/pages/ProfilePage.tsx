import { Mail, Phone, Shield, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Badge } from '@/components/ui/badge';
import { UserStatus } from '@/types';
import { ProfilePictureUpload } from '../components/ProfilePictureUpload';
import { BioEditor } from '../components/BioEditor';
import { useProfile } from '../hooks/useProfile';
import { formatDate } from '../utils';

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value ?? 'Not set'}</p>
    </div>
  );
}

export function ProfilePage() {
  const profileQuery = useProfile();
  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (profileQuery.isError || !profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="Unable to load profile"
        description="Your profile could not be loaded right now."
        action={{ label: 'Retry', onClick: () => void profileQuery.refetch() }}
      />
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border bg-card p-5 text-center">
          <ProfilePictureUpload
            fullName={profile.fullName}
            profilePictureUrl={profile.profilePictureUrl}
            size="large"
          />
          <div className="space-y-2">
            <h1 className="break-words text-2xl font-semibold tracking-normal">
              {profile.fullName}
            </h1>
            <div className="flex flex-wrap justify-center gap-2">
              <RoleBadge role={profile.userType} />
              <Badge variant={profile.status === UserStatus.ACTIVE ? 'default' : 'destructive'}>
                {profile.status === UserStatus.ACTIVE ? 'Active' : 'Suspended'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2 text-left text-sm">
            <p className="flex min-w-0 items-center gap-2">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{profile.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {profile.phone}
            </p>
            <p className="flex items-center gap-2">
              <Shield className="size-4 shrink-0 text-muted-foreground" />
              Joined {formatDate(profile.createdAt)}
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <BioEditor bio={profile.bio} />
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Profile details</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Gender" value={profile.gender} />
              <Field label="Department ID" value={profile.departmentId} />
              <Field label="Created" value={formatDate(profile.createdAt)} />
              {profile.studentInfo ? (
                <>
                  <Field label="Roll number" value={profile.studentInfo.rollNumber} />
                  <Field label="Class ID" value={profile.studentInfo.classId} />
                  <Field label="Program" value={profile.studentInfo.class.program.code} />
                </>
              ) : null}
              {profile.teacherInfo ? (
                <Field label="Designation" value={profile.teacherInfo.designation} />
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Role assignments</h2>
            {profile.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.roles.map((assignment) => (
                  <RoleBadge
                    key={`${assignment.role}-${assignment.serverId}-${assignment.channelId ?? 'server'}`}
                    role={assignment.role}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                No scoped role assignments.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
