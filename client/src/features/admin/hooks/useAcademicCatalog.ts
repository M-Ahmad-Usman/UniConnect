import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { queryKeys } from '@/lib/constants';
import type {
  ClassListParams,
  CourseListParams,
  ProgramListParams,
  TeacherAssignmentInput,
} from '@/types';
import { userListParamsToRecord } from '../utils';
import type {
  AddCurriculumRequest,
  CreateClassRequest,
  CreateCourseRequest,
  CreateDepartmentRequest,
  CreateProgramRequest,
  UpdateCourseRequest,
  UpdateDepartmentRequest,
  UpdateProgramRequest,
  CandidateParams,
} from '@/api/endpoints/catalog.api';

export function useDepartment(departmentId: number | null) {
  return useQuery({
    queryKey: departmentId ? queryKeys.departments.detail(departmentId) : ['departments', null],
    queryFn: () => catalogApi.getDepartment(departmentId!),
    enabled: departmentId !== null,
  });
}

export function useDepartmentStats(departmentId: number | null) {
  return useQuery({
    queryKey: departmentId ? queryKeys.departments.stats(departmentId) : ['departments', null, 'stats'],
    queryFn: () => catalogApi.getDepartmentStats(departmentId!),
    enabled: departmentId !== null,
  });
}

export function useDegreeLevels() {
  return useQuery({
    queryKey: queryKeys.degreeLevels.list(),
    queryFn: catalogApi.listDegreeLevels,
  });
}

export function useDisciplines() {
  return useQuery({
    queryKey: queryKeys.disciplines.list(),
    queryFn: catalogApi.listDisciplines,
  });
}

export function usePrograms(params: ProgramListParams) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: queryKeys.programs.list(normalized),
    queryFn: () => catalogApi.listPrograms(params),
  });
}

export function useProgram(programId: number | null) {
  return useQuery({
    queryKey: programId ? queryKeys.programs.detail(programId) : ['programs', null],
    queryFn: () => catalogApi.getProgram(programId!),
    enabled: programId !== null,
  });
}

export function useCurriculum(
  programId: number | null,
  params: { semesterNumber?: number; batchYear?: number } = {},
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: programId
      ? queryKeys.programs.curriculum(programId, normalized)
      : ['programs', null, 'curriculum'],
    queryFn: () => catalogApi.listCurriculum(programId!, params),
    enabled: programId !== null,
  });
}

export function useAdminClass(classId: number | null) {
  return useQuery({
    queryKey: classId ? queryKeys.classes.detail(classId) : ['classes', null],
    queryFn: () => catalogApi.getClass(classId!),
    enabled: classId !== null,
  });
}

export function useAdminClassCourses(classId: number | null) {
  return useQuery({
    queryKey: classId ? queryKeys.classes.courses(classId) : ['classes', null, 'courses'],
    queryFn: () => catalogApi.listClassCourses(classId!),
    enabled: classId !== null,
  });
}

export function useClassStudents(
  classId: number | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classId
      ? queryKeys.classes.students(classId, normalized)
      : ['classes', null, 'students'],
    queryFn: () => catalogApi.listClassStudents(classId!, params),
    enabled: classId !== null && enabled,
  });
}

export function useStudentCandidates(
  classId: number | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classId
      ? queryKeys.classes.studentCandidates(classId, normalized)
      : ['classes', null, 'student-candidates'],
    queryFn: () => catalogApi.listStudentCandidates(classId!, params),
    enabled: classId !== null && enabled,
  });
}

export function useTeacherCandidates(
  classId: number | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classId
      ? queryKeys.classes.teacherCandidates(classId, normalized)
      : ['classes', null, 'teacher-candidates'],
    queryFn: () => catalogApi.listTeacherCandidates(classId!, params),
    enabled: classId !== null && enabled,
  });
}

export function useAdminClasses(params: ClassListParams, enabled = true) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: queryKeys.classes.list(normalized),
    queryFn: () => catalogApi.listClasses(params),
    enabled,
  });
}

export function useAdminCourses(params: CourseListParams, enabled = true) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: queryKeys.courses.list(normalized),
    queryFn: () => catalogApi.listCourses(params),
    enabled,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDepartmentRequest) => catalogApi.createDepartment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
      toast.success('Department created');
    },
  });
}

export function useUpdateDepartment(departmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDepartmentRequest) =>
      catalogApi.updateDepartment(departmentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(departmentId) });
      toast.success('Department updated');
    },
  });
}

export function useCreateProgram(departmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProgramRequest) => catalogApi.createProgram(departmentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.programs(departmentId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success('Program created');
    },
  });
}

export function useUpdateProgram(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProgramRequest) => catalogApi.updateProgram(programId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success('Program updated');
    },
  });
}

export function useCreateDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string }) => catalogApi.createDiscipline(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disciplines.list() });
      toast.success('Discipline created');
    },
  });
}

export function useUpdateDiscipline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      catalogApi.updateDiscipline(id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disciplines.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success('Discipline updated');
    },
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateClassRequest) => catalogApi.createClass(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() });
      toast.success('Class created');
    },
  });
}

export function useAssignClassCourse(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TeacherAssignmentInput) => catalogApi.assignCourse(classId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      toast.success('Course assigned');
    },
  });
}

export function useTransferClassStudent(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => catalogApi.transferStudent(classId, studentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.students(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.studentCandidates(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Student transferred');
    },
  });
}

export function useReplaceCourseTeacher(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, teacherId }: { courseId: number; teacherId: number }) =>
      catalogApi.replaceCourseTeacher(classId, courseId, teacherId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Teacher replaced');
    },
  });
}

export function useRemoveClassCourse(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => catalogApi.removeClassCourse(classId, courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      toast.success('Course removed');
    },
  });
}

export function useAdvanceSemester(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherAssignments: TeacherAssignmentInput[]) =>
      catalogApi.advanceSemester(classId, teacherAssignments),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Semester advanced');
    },
  });
}

export function useGraduateClass(classId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => catalogApi.graduateClass(classId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Class graduated');
    },
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCourseRequest) => catalogApi.createCourse(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
      toast.success('Course created');
    },
  });
}

export function useUpdateCourse(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCourseRequest) => catalogApi.updateCourse(courseId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success('Course updated');
    },
  });
}

export function useAddCurriculum(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddCurriculumRequest) => catalogApi.addCurriculum(programId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.curriculumRoot(programId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success('Curriculum entry added');
    },
  });
}

export function useRemoveCurriculum(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (curriculumId: number) => catalogApi.removeCurriculum(programId, curriculumId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.curriculumRoot(programId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success('Curriculum entry removed');
    },
  });
}
