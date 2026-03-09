import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.24),transparent_45%),linear-gradient(160deg,rgba(15,23,42,0.98),rgba(2,6,23,1))]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(14,165,233,0.10),transparent)]" />
      <Card className="relative w-full max-w-md border border-white/10 bg-white/8 py-0 backdrop-blur-xl">
        <CardHeader className="gap-3 border-b border-white/10 px-6 py-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">
              UniConnect
            </p>
            <CardTitle className="text-2xl font-semibold tracking-tight text-white">
              {title}
            </CardTitle>
            {subtitle ? (
              <CardDescription className="text-sm text-slate-300">{subtitle}</CardDescription>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">{children}</CardContent>
      </Card>
    </div>
  );
}
