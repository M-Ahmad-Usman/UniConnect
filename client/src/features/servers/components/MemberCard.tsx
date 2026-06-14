import { CalendarDays, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { UserType, type ServerMember } from '@/types';

interface MemberCardProps {
  member: ServerMember;
}

function getUserTypeLabel(userType: ServerMember['user']['userType']) {
  switch (userType) {
    case UserType.ADMIN:
      return 'Admin';
    case UserType.TEACHER:
      return 'Teacher';
    case UserType.STUDENT:
    default:
      return 'Student';
  }
}

function formatJoinedAt(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MemberCard({ member }: MemberCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            fullName={member.user.fullName}
            profilePictureUrl={member.user.profilePictureUrl}
            size="lg"
            className="ring-2 ring-background"
          />

          <div className="space-y-1">
            <h3 className="text-sm font-semibold leading-none">{member.user.fullName}</h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" />
              {member.user.email}
            </p>
          </div>
        </div>

        <Badge variant="outline">{getUserTypeLabel(member.user.userType)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {member.badges.length > 0 ? (
          member.badges.map((badge) => (
            <RoleBadge key={`${member.user.publicId}-${badge}`} role={badge} />
          ))
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Member
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="size-3" />
        Joined {formatJoinedAt(member.joinedAt)}
      </div>
    </article>
  );
}
