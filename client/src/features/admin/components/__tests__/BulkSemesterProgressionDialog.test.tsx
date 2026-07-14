import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BulkSemesterProgressionDialog } from '../BulkSemesterProgressionDialog';

const klass = {
  publicId: '01900000-0000-7000-8000-000000000020',
  currentSemester: 2,
  academicYear: 2026,
  admissionYear: 2025,
  section: 'A' as const,
  serverPublicId: '01900000-0000-7000-8000-000000000021',
  status: 'ACTIVE' as const,
  graduatedAt: null,
  graduatedByPublicId: null,
  program: {
    id: 1,
    code: 'BSCS',
    department: { id: 1, name: 'Computer Science', code: 'CS' },
    discipline: { id: 1, name: 'Computer Science' },
    degreeLevel: { id: 1, level: 'Bachelor' },
  },
  cr: null,
};

describe('BulkSemesterProgressionDialog', () => {
  afterEach(cleanup);

  it('renders independent success and failure results', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BulkSemesterProgressionDialog
          open
          onOpenChange={vi.fn()}
          classes={[klass]}
          loading={false}
          result={{
            total: 2,
            succeeded: 1,
            failed: 1,
            results: [
              { classPublicId: klass.publicId, status: 'SUCCESS', data: {} as never },
              {
                classPublicId: '01900000-0000-7000-8000-000000000022',
                status: 'FAILED',
                error: { code: 'VALIDATION_ERROR', message: 'Curriculum is required' },
              },
            ],
          }}
          onSubmit={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('1 succeeded, 1 failed')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Curriculum is required')).toBeInTheDocument();
  });
});
