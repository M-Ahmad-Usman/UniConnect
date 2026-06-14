import { StableAvatar } from './StableAvatar';

interface UserAvatarProps {
  fullName: string;
  profilePictureUrl?: string | null;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  fallbackClassName?: string;
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  fullName,
  profilePictureUrl,
  size = 'default',
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <StableAvatar
      src={profilePictureUrl}
      alt={fullName}
      fallback={getInitials(fullName)}
      size={size}
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}
