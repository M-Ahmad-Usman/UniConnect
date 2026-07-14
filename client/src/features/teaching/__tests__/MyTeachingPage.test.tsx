import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MyTeachingPage } from '../pages/MyTeachingPage';

const useMyTeaching = vi.fn();

vi.mock('../hooks/useMyTeaching', () => ({
  useMyTeaching: (page: number) => useMyTeaching(page),
}));

const baseAssignment = {
  assignedAt: '2026-01-01T00:00:00.000Z',
  course: { id: 1, code: 'CS-401', title: 'Distributed Systems', creditHours: 3 },
  class: {
    publicId: '01900000-0000-7000-8000-000000000001',
    currentSemester: 4,
    admissionYear: 2024,
    academicYear: 2026,
    section: 'A' as const,
    status: 'ACTIVE' as const,
    program: { id: 1, code: 'BSCS' },
    server: {
      publicId: '01900000-0000-7000-8000-000000000002',
      name: 'BSCS - S4 - Section A',
    },
  },
  channel: {
    publicId: '01900000-0000-7000-8000-000000000003',
    name: 'CS-401',
    isArchived: false,
    isLocked: false,
  },
};

describe('MyTeachingPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders active assignments with direct channel links', () => {
    useMyTeaching.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        active: [baseAssignment],
        history: [],
        historyPagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    });

    render(<MyTeachingPage />, { wrapper: MemoryRouter });

    expect(screen.getByRole('heading', { name: 'My Teaching' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /CS-401: Distributed Systems/ })).toHaveAttribute(
      'href',
      '/servers/01900000-0000-7000-8000-000000000002/channels/01900000-0000-7000-8000-000000000003',
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('links progression history but keeps replacement history non-interactive', async () => {
    useMyTeaching.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        active: [],
        history: [
          {
            ...baseAssignment,
            publicId: '01900000-0000-7000-8000-000000000010',
            semesterNumber: 4,
            endedAt: '2026-07-01T00:00:00.000Z',
            endReason: 'SEMESTER_PROGRESSION' as const,
            channel: { ...baseAssignment.channel, isArchived: true, isLocked: true },
          },
          {
            ...baseAssignment,
            publicId: '01900000-0000-7000-8000-000000000011',
            semesterNumber: 4,
            endedAt: '2026-06-01T00:00:00.000Z',
            endReason: 'REPLACED' as const,
          },
        ],
        historyPagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
    });

    render(<MyTeachingPage />, { wrapper: MemoryRouter });
    screen.getByRole('tab', { name: 'History (2)' }).click();

    expect(await screen.findByText('Semester completed')).toBeInTheDocument();
    expect(screen.getByText('Replaced')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
});
