import { apiClient } from '@/api/client';
import type {
  ClassCourseAssignment,
  ClassDetail,
  ClassListItem,
  ClassListParams,
  ClassStudent,
  ClassDeletionImpact,
  CourseDetail,
  CourseDeletionImpact,
  CourseListItem,
  CourseListParams,
  CurriculumEntry,
  DegreeLevel,
  DepartmentDetail,
  DepartmentDeletionImpact,
  DepartmentListItem,
  DepartmentStats,
  Discipline,
  PaginatedResponse,
  ProgramDetail,
  ProgramDeletionImpact,
  ProgramListParams,
  ProgramListItem,
  TeacherCandidate,
  TeacherAssignmentInput,
} from '@/types';

export interface CreateDepartmentRequest {
  name: string;
  code: string;
}

export type UpdateDepartmentRequest = Partial<CreateDepartmentRequest>;

export interface CreateProgramRequest {
  disciplineId: number;
  degreeLevelId: number;
  semesters: number;
  code: string;
}

export interface UpdateProgramRequest {
  semesters?: number;
  code?: string;
}

export interface CreateClassRequest {
  programId: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: 'A' | 'B';
}

export interface CreateCourseRequest {
  title: string;
  code: string;
  creditHours: number;
  departmentId: number;
}

export interface UpdateCourseRequest {
  title?: string;
  code?: string;
  creditHours?: number;
}

export interface AddCurriculumRequest {
  courseId: number;
  semesterNumber: number;
  batchYear: number;
}

export interface CurriculumParams {
  semesterNumber?: number;
  batchYear?: number;
}

export interface CandidateParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const catalogApi = {
  async listDepartments() {
    const response = await apiClient.get<DepartmentListItem[]>('/departments');
    return response.data;
  },

  async getDepartment(departmentId: number) {
    const response = await apiClient.get<DepartmentDetail>(`/departments/${departmentId}`);
    return response.data;
  },

  async getDepartmentStats(departmentId: number) {
    const response = await apiClient.get<DepartmentStats>(`/departments/${departmentId}/stats`);
    return response.data;
  },

  async getDepartmentDeletionImpact(departmentId: number) {
    const response = await apiClient.get<DepartmentDeletionImpact>(
      `/departments/${departmentId}/deletion-impact`,
    );
    return response.data;
  },

  async createDepartment(payload: CreateDepartmentRequest) {
    const response = await apiClient.post<DepartmentListItem>('/departments', payload);
    return response.data;
  },

  async updateDepartment(departmentId: number, payload: UpdateDepartmentRequest) {
    const response = await apiClient.patch<DepartmentListItem>(
      `/departments/${departmentId}`,
      payload,
    );
    return response.data;
  },

  async listDepartmentPrograms(departmentId: number) {
    const response = await apiClient.get<ProgramListItem[]>(
      `/departments/${departmentId}/programs`,
    );
    return response.data;
  },

  async createProgram(departmentId: number, payload: CreateProgramRequest) {
    const response = await apiClient.post<ProgramListItem>(
      `/departments/${departmentId}/programs`,
      payload,
    );
    return response.data;
  },

  async listPrograms(params: ProgramListParams) {
    const response = await apiClient.get<PaginatedResponse<ProgramDetail>>('/programs', {
      params,
    });
    return response.data;
  },

  async getProgram(programId: number) {
    const response = await apiClient.get<ProgramDetail>(`/programs/${programId}`);
    return response.data;
  },

  async getProgramDeletionImpact(programId: number) {
    const response = await apiClient.get<ProgramDeletionImpact>(
      `/programs/${programId}/deletion-impact`,
    );
    return response.data;
  },

  async updateProgram(programId: number, payload: UpdateProgramRequest) {
    const response = await apiClient.patch<ProgramListItem>(`/programs/${programId}`, payload);
    return response.data;
  },

  async listCurriculum(programId: number, params: CurriculumParams = {}) {
    const response = await apiClient.get<CurriculumEntry[]>(`/programs/${programId}/curriculum`, {
      params,
    });
    return response.data;
  },

  async addCurriculum(programId: number, payload: AddCurriculumRequest) {
    const response = await apiClient.post<CurriculumEntry>(
      `/programs/${programId}/curriculum`,
      payload,
    );
    return response.data;
  },

  async removeCurriculum(programId: number, curriculumId: number) {
    const response = await apiClient.delete<null>(
      `/programs/${programId}/curriculum/${curriculumId}`,
    );
    return response.data;
  },

  async listDegreeLevels() {
    const response = await apiClient.get<DegreeLevel[]>('/degree-levels');
    return response.data;
  },

  async listDisciplines() {
    const response = await apiClient.get<Discipline[]>('/disciplines');
    return response.data;
  },

  async createDiscipline(payload: { name: string }) {
    const response = await apiClient.post<Discipline>('/disciplines', payload);
    return response.data;
  },

  async updateDiscipline(disciplineId: number, payload: { name: string }) {
    const response = await apiClient.patch<Discipline>(`/disciplines/${disciplineId}`, payload);
    return response.data;
  },

  async listClasses(params: ClassListParams) {
    const response = await apiClient.get<PaginatedResponse<ClassListItem>>('/classes', { params });
    return response.data;
  },

  async getClass(classPublicId: string) {
    const response = await apiClient.get<ClassDetail>(`/classes/${classPublicId}`);
    return response.data;
  },

  async getClassDeletionImpact(classPublicId: string) {
    const response = await apiClient.get<ClassDeletionImpact>(
      `/classes/${classPublicId}/deletion-impact`,
    );
    return response.data;
  },

  async createClass(payload: CreateClassRequest) {
    const response = await apiClient.post<ClassListItem>('/classes', payload);
    return response.data;
  },

  async listClassCourses(classPublicId: string) {
    const response = await apiClient.get<ClassCourseAssignment[]>(`/classes/${classPublicId}/courses`);
    return response.data;
  },

  async listClassStudents(classPublicId: string, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<ClassStudent>>(
      `/classes/${classPublicId}/students`,
      { params },
    );
    return response.data;
  },

  async listStudentCandidates(classPublicId: string, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<ClassStudent>>(
      `/classes/${classPublicId}/student-candidates`,
      { params },
    );
    return response.data;
  },

  async transferStudent(classPublicId: string, studentPublicId: string) {
    const response = await apiClient.post<ClassStudent>(`/classes/${classPublicId}/students`, {
      studentPublicId,
    });
    return response.data;
  },

  async listTeacherCandidates(classPublicId: string, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<TeacherCandidate>>(
      `/classes/${classPublicId}/teacher-candidates`,
      { params },
    );
    return response.data;
  },

  async assignCourse(classPublicId: string, payload: TeacherAssignmentInput) {
    const response = await apiClient.post<ClassCourseAssignment>(
      `/classes/${classPublicId}/courses`,
      payload,
    );
    return response.data;
  },

  async removeClassCourse(classPublicId: string, courseId: number) {
    const response = await apiClient.delete<null>(`/classes/${classPublicId}/courses/${courseId}`);
    return response.data;
  },

  async replaceCourseTeacher(classPublicId: string, courseId: number, teacherPublicId: string) {
    const response = await apiClient.patch<ClassCourseAssignment>(
      `/classes/${classPublicId}/courses/${courseId}/teacher`,
      { teacherPublicId },
    );
    return response.data;
  },

  async advanceSemester(classPublicId: string, teacherAssignments: TeacherAssignmentInput[]) {
    const response = await apiClient.post<ClassDetail>(`/classes/${classPublicId}/semester-progression`, {
      teacherAssignments,
    });
    return response.data;
  },

  async graduateClass(classPublicId: string) {
    const response = await apiClient.post<ClassDetail>(`/classes/${classPublicId}/graduation`);
    return response.data;
  },

  async listCourses(params: CourseListParams) {
    const response = await apiClient.get<PaginatedResponse<CourseListItem>>('/courses', { params });
    return response.data;
  },

  async getCourse(courseId: number) {
    const response = await apiClient.get<CourseDetail>(`/courses/${courseId}`);
    return response.data;
  },

  async getCourseDeletionImpact(courseId: number) {
    const response = await apiClient.get<CourseDeletionImpact>(
      `/courses/${courseId}/deletion-impact`,
    );
    return response.data;
  },

  async createCourse(payload: CreateCourseRequest) {
    const response = await apiClient.post<CourseListItem>('/courses', payload);
    return response.data;
  },

  async updateCourse(courseId: number, payload: UpdateCourseRequest) {
    const response = await apiClient.patch<CourseListItem>(`/courses/${courseId}`, payload);
    return response.data;
  },
};
