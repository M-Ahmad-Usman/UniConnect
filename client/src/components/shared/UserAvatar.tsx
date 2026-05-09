import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const shouldShowImage = Boolean(profilePictureUrl && loadedSrc === profilePictureUrl);

  useEffect(() => {
    if (!profilePictureUrl) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (!cancelled) {
        setLoadedSrc(profilePictureUrl);
      }
    };
    image.src = profilePictureUrl;

    return () => {
      cancelled = true;
    };
  }, [profilePictureUrl]);

  return (
    <Avatar size={size} className={cn('overflow-hidden bg-muted', className)}>
      {shouldShowImage ? (
        <AvatarImage
          src={profilePictureUrl ?? undefined}
          alt={fullName}
          className="transition-opacity duration-150"
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>{getInitials(fullName)}</AvatarFallback>
    </Avatar>
  );
}
