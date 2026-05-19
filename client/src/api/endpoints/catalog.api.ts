import { apiClient } from '@/api/client';
import type {
  ClassCourseAssignment,
  ClassDetail,
  ClassListItem,
  ClassListParams,
  ClassStudent,
  CourseDetail,
  CourseListItem,
  CourseListParams,
  CurriculumEntry,
  DegreeLevel,
  DepartmentDetail,
  DepartmentListItem,
  DepartmentStats,
  Discipline,
  PaginatedResponse,
  ProgramDetail,
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

  async getClass(classId: number) {
    const response = await apiClient.get<ClassDetail>(`/classes/${classId}`);
    return response.data;
  },

  async createClass(payload: CreateClassRequest) {
    const response = await apiClient.post<ClassListItem>('/classes', payload);
    return response.data;
  },

  async listClassCourses(classId: number) {
    const response = await apiClient.get<ClassCourseAssignment[]>(`/classes/${classId}/courses`);
    return response.data;
  },

  async listClassStudents(classId: number, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<ClassStudent>>(
      `/classes/${classId}/students`,
      { params },
    );
    return response.data;
  },

  async listStudentCandidates(classId: number, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<ClassStudent>>(
      `/classes/${classId}/student-candidates`,
      { params },
    );
    return response.data;
  },

  async transferStudent(classId: number, studentId: number) {
    const response = await apiClient.post<ClassStudent>(`/classes/${classId}/students`, {
      studentId,
    });
    return response.data;
  },

  async listTeacherCandidates(classId: number, params: CandidateParams = {}) {
    const response = await apiClient.get<PaginatedResponse<TeacherCandidate>>(
      `/classes/${classId}/teacher-candidates`,
      { params },
    );
    return response.data;
  },

  async assignCourse(classId: number, payload: TeacherAssignmentInput) {
    const response = await apiClient.post<ClassCourseAssignment>(
      `/classes/${classId}/courses`,
      payload,
    );
    return response.data;
  },

  async removeClassCourse(classId: number, courseId: number) {
    const response = await apiClient.delete<null>(`/classes/${classId}/courses/${courseId}`);
    return response.data;
  },

  async replaceCourseTeacher(classId: number, courseId: number, teacherId: number) {
    const response = await apiClient.patch<ClassCourseAssignment>(
      `/classes/${classId}/courses/${courseId}/teacher`,
      { teacherId },
    );
    return response.data;
  },

  async advanceSemester(classId: number, teacherAssignments: TeacherAssignmentInput[]) {
    const response = await apiClient.post<ClassDetail>(`/classes/${classId}/semester-progression`, {
      teacherAssignments,
    });
    return response.data;
  },

  async graduateClass(classId: number) {
    const response = await apiClient.post<ClassDetail>(`/classes/${classId}/graduation`);
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

  async createCourse(payload: CreateCourseRequest) {
    const response = await apiClient.post<CourseListItem>('/courses', payload);
    return response.data;
  },

  async updateCourse(courseId: number, payload: UpdateCourseRequest) {
    const response = await apiClient.patch<CourseListItem>(`/courses/${courseId}`, payload);
    return response.data;
  },
};
