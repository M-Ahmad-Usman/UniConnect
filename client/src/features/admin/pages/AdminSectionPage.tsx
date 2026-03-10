import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

interface AdminSectionPageProps {
  title: string;
  description: string;
}

export function AdminSectionPage({ title, description }: AdminSectionPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground text-sm">Administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <EmptyState icon={Construction} title={`${title} is next`} description={description} />
    </div>
  );
}