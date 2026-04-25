import type { ReactNode } from 'react';

interface CanProps {
  when: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ when, children, fallback = null }: CanProps) {
  if (!when) {
    return fallback;
  }

  return children;
}
