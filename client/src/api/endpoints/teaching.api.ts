import { apiClient } from '@/api/client';

export type TeachingEndReason = 'REPLACED' | 'REMOVED' | 'SEMESTER_PROGRESSION' | 'GRADUATION';

export interface TeachingAssignment {
  assignedAt: string;
  course: { id: number; code: string; title: string; creditHours: number };
  class: {
    publicId: string;
    currentSemester: number;
    admissionYear: number;
    academicYear: number;
    section: 'A' | 'B';
    status: 'ACTIVE' | 'GRADUATED';
    program: { id: number; code: string };
    server: { publicId: string; name: string };
  };
  channel: { publicId: string; name: string; isArchived: boolean; isLocked: boolean };
}

export interface TeachingHistoryAssignment extends TeachingAssignment {
  publicId: string;
  semesterNumber: number;
  endedAt: string;
  endReason: TeachingEndReason;
}

export interface MyTeachingResponse {
  active: TeachingAssignment[];
  history: TeachingHistoryAssignment[];
  historyPagination: { page: number; limit: number; total: number; totalPages: number };
}

export const teachingApi = {
  async getMine(params: { historyPage?: number; historyLimit?: number } = {}) {
    const response = await apiClient.get<MyTeachingResponse>('/teaching/me', { params });
    return response.data;
  },
};
