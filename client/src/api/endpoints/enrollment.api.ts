import { apiClient } from '@/api/client';
import type {
  EnrollmentBootstrap,
  EnrollmentCandidateParams,
  EnrollmentClassDetail,
  EnrollmentClassListItem,
  EnrollmentClassParams,
  EnrollmentClassStudent,
  EnrollmentCreateClassRequest,
  EnrollmentCreateStudentRequest,
  EnrollmentCreateStudentResponse,
  EnrollmentCurriculumEntry,
  EnrollmentImportResult,
  EnrollmentProgram,
  EnrollmentProgramParams,
  PaginatedResponse,
} from '@/types';

export const enrollmentApi = {
  async bootstrap() {
    const response = await apiClient.get<EnrollmentBootstrap>('/enrollment/bootstrap');
    return response.data;
  },

  async listPrograms(params: EnrollmentProgramParams) {
    const response = await apiClient.get<PaginatedResponse<EnrollmentProgram>>(
      '/enrollment/programs',
      { params },
    );
    return response.data;
  },

  async listCurriculum(
    programId: number,
    params: { semesterNumber?: number; batchYear?: number } = {},
  ) {
    const response = await apiClient.get<EnrollmentCurriculumEntry[]>(
      `/enrollment/programs/${programId}/curriculum`,
      { params },
    );
    return response.data;
  },

  async listClasses(params: EnrollmentClassParams) {
    const response = await apiClient.get<PaginatedResponse<EnrollmentClassListItem>>(
      '/enrollment/classes',
      { params },
    );
    return response.data;
  },

  async createClass(payload: EnrollmentCreateClassRequest) {
    const response = await apiClient.post<EnrollmentClassListItem>('/enrollment/classes', payload);
    return response.data;
  },

  async getClass(classPublicId: string) {
    const response = await apiClient.get<EnrollmentClassDetail>(
      `/enrollment/classes/${classPublicId}`,
    );
    return response.data;
  },

  async listClassStudents(classPublicId: string, params: EnrollmentCandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<EnrollmentClassStudent>>(
      `/enrollment/classes/${classPublicId}/students`,
      { params },
    );
    return response.data;
  },

  async listTransferCandidates(classPublicId: string, params: EnrollmentCandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<EnrollmentClassStudent>>(
      `/enrollment/classes/${classPublicId}/transfer-candidates`,
      { params },
    );
    return response.data;
  },

  async transferStudent(classPublicId: string, studentPublicId: string) {
    const response = await apiClient.post<EnrollmentClassStudent>(
      `/enrollment/classes/${classPublicId}/transfers`,
      { studentPublicId },
    );
    return response.data;
  },

  async createStudent(payload: EnrollmentCreateStudentRequest) {
    const response = await apiClient.post<EnrollmentCreateStudentResponse>(
      '/enrollment/students',
      payload,
    );
    return response.data;
  },

  async importStudents(file: File, onUploadProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<EnrollmentImportResult>(
      '/enrollment/students/import',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!onUploadProgress || !event.total) return;
          onUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );
    return response.data;
  },
};
