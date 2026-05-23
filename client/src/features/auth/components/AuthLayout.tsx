import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md border-border bg-card py-0 shadow-lg shadow-foreground/5">
        <CardHeader className="justify-items-center gap-4 border-b px-6 py-8 text-center">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-border bg-white p-2 shadow-sm">
            <img src="/logo.svg" alt="" className="size-full object-contain" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              UniConnect
            </p>
            <CardTitle className="text-2xl font-semibold tracking-tight text-card-foreground">
              {title}
            </CardTitle>
            {subtitle ? (
              <CardDescription className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">{children}</CardContent>
      </Card>
    </div>
  );
}
