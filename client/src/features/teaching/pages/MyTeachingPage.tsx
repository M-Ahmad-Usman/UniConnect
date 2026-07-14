import { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TeachingAssignment, TeachingHistoryAssignment } from '@/api/endpoints/teaching.api';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/lib/constants';
import { useMyTeaching } from '@/features/teaching/hooks/useMyTeaching';

const endReasonLabel = {
  REPLACED: 'Replaced',
  REMOVED: 'Removed',
  SEMESTER_PROGRESSION: 'Semester completed',
  GRADUATION: 'Graduated',
} as const;

function AssignmentRow({ assignment }: { assignment: TeachingAssignment }) {
  return (
    <Link
      to={ROUTES.CHANNEL(assignment.class.server.publicId, assignment.channel.publicId)}
      className="grid gap-2 border-b border-border px-3 py-4 transition-colors last:border-b-0 hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {assignment.course.code}: {assignment.course.title}
        </p>
        <p className="text-muted-foreground text-sm">
          {assignment.course.creditHours} credit hours
        </p>
      </div>
      <div className="min-w-0 text-sm">
        <p>{assignment.class.server.name}</p>
        <p className="text-muted-foreground">
          {assignment.class.program.code}, semester {assignment.class.currentSemester}, section{' '}
          {assignment.class.section}
        </p>
      </div>
      <Badge variant={assignment.channel.isArchived ? 'outline' : 'secondary'}>
        {assignment.channel.isArchived ? 'Read only' : 'Active'}
      </Badge>
    </Link>
  );
}

function HistoryRow({ assignment }: { assignment: TeachingHistoryAssignment }) {
  const readable =
    assignment.endReason === 'SEMESTER_PROGRESSION' || assignment.endReason === 'GRADUATION';
  const content = (
    <div className="grid gap-2 border-b border-border px-3 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="font-medium">
          {assignment.course.code}: {assignment.course.title}
        </p>
        <p className="text-muted-foreground text-sm">
          Taught in semester {assignment.semesterNumber}
        </p>
      </div>
      <div className="min-w-0 text-sm">
        <p>{assignment.class.server.name}</p>
        <p className="text-muted-foreground">
          Ended {new Date(assignment.endedAt).toLocaleDateString()}
        </p>
      </div>
      <Badge variant="outline">{endReasonLabel[assignment.endReason]}</Badge>
    </div>
  );

  return readable ? (
    <Link
      className="block transition-colors hover:bg-muted/50"
      to={ROUTES.CHANNEL(assignment.class.server.publicId, assignment.channel.publicId)}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

export function MyTeachingPage() {
  const [historyPage, setHistoryPage] = useState(1);
  const query = useMyTeaching(historyPage);

  if (query.isLoading) return <LoadingSpinner fullPage />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Unable to load teaching assignments"
        action={{ label: 'Retry', onClick: () => void query.refetch() }}
      />
    );
  }

  const { active, history, historyPagination } = query.data;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Teaching</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Current courses and completed teaching assignments.
        </p>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyPagination.total})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {active.length ? (
            <div className="border-y border-border">
              {active.map((item) => (
                <AssignmentRow key={`${item.class.publicId}-${item.course.id}`} assignment={item} />
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No active teaching assignments" />
          )}
        </TabsContent>
        <TabsContent value="history">
          {history.length ? (
            <>
              <div className="border-y border-border">
                {history.map((item) => (
                  <HistoryRow key={item.publicId} assignment={item} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-muted-foreground text-sm">
                  Page {historyPagination.page} of {historyPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous history page"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((page) => page - 1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next history page"
                  disabled={historyPage >= historyPagination.totalPages}
                  onClick={() => setHistoryPage((page) => page + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </>
          ) : (
            <EmptyState icon={History} title="No teaching history" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
