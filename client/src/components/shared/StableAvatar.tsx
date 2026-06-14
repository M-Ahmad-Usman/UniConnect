import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface StableAvatarProps {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function StableAvatar({
  src,
  alt,
  fallback,
  size = 'default',
  className,
  imageClassName,
  fallbackClassName,
}: StableAvatarProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const shouldShowImage = Boolean(src && loadedSrc === src);

  useEffect(() => {
    if (!src) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (!cancelled) {
        setLoadedSrc(src);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setLoadedSrc(null);
      }
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <Avatar size={size} className={cn('overflow-hidden bg-muted', className)}>
      {shouldShowImage ? (
        <AvatarImage
          src={src ?? undefined}
          alt={alt}
          className={cn('transition-opacity duration-150', imageClassName)}
        />
      ) : null}
      <AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
    </Avatar>
  );
}
