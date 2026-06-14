import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { catalogApi } from '@/api/endpoints/catalog.api';
import { getApiErrorMessage } from '@/features/auth/utils';
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
  BulkAddCurriculumRequest,
  CopyCurriculumBatchRequest,
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
    queryKey: departmentId
      ? queryKeys.departments.stats(departmentId)
      : ['departments', null, 'stats'],
    queryFn: () => catalogApi.getDepartmentStats(departmentId!),
    enabled: departmentId !== null,
  });
}

export function useDepartmentDeletionImpact(departmentId: number | null, enabled = true) {
  return useQuery({
    queryKey: departmentId
      ? queryKeys.departments.deletionImpact(departmentId)
      : ['departments', null, 'deletion-impact'],
    queryFn: () => catalogApi.getDepartmentDeletionImpact(departmentId!),
    enabled: departmentId !== null && enabled,
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

export function usePrograms(params: ProgramListParams, enabled = true) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: queryKeys.programs.list(normalized),
    queryFn: () => catalogApi.listPrograms(params),
    enabled,
  });
}

export function useProgram(programId: number | null) {
  return useQuery({
    queryKey: programId ? queryKeys.programs.detail(programId) : ['programs', null],
    queryFn: () => catalogApi.getProgram(programId!),
    enabled: programId !== null,
  });
}

export function useProgramDeletionImpact(programId: number | null, enabled = true) {
  return useQuery({
    queryKey: programId
      ? queryKeys.programs.deletionImpact(programId)
      : ['programs', null, 'deletion-impact'],
    queryFn: () => catalogApi.getProgramDeletionImpact(programId!),
    enabled: programId !== null && enabled,
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

export function useAdminClass(classPublicId: string | null) {
  return useQuery({
    queryKey: classPublicId ? queryKeys.classes.detail(classPublicId) : ['classes', null],
    queryFn: () => catalogApi.getClass(classPublicId!),
    enabled: classPublicId !== null,
  });
}

export function useClassDeletionImpact(classPublicId: string | null, enabled = true) {
  return useQuery({
    queryKey: classPublicId
      ? queryKeys.classes.deletionImpact(classPublicId)
      : ['classes', null, 'deletion-impact'],
    queryFn: () => catalogApi.getClassDeletionImpact(classPublicId!),
    enabled: classPublicId !== null && enabled,
  });
}

export function useAdminClassCourses(classPublicId: string | null) {
  return useQuery({
    queryKey: classPublicId ? queryKeys.classes.courses(classPublicId) : ['classes', null, 'courses'],
    queryFn: () => catalogApi.listClassCourses(classPublicId!),
    enabled: classPublicId !== null,
  });
}

export function useClassStudents(
  classPublicId: string | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classPublicId
      ? queryKeys.classes.students(classPublicId, normalized)
      : ['classes', null, 'students'],
    queryFn: () => catalogApi.listClassStudents(classPublicId!, params),
    enabled: classPublicId !== null && enabled,
  });
}

export function useStudentCandidates(
  classPublicId: string | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classPublicId
      ? queryKeys.classes.studentCandidates(classPublicId, normalized)
      : ['classes', null, 'student-candidates'],
    queryFn: () => catalogApi.listStudentCandidates(classPublicId!, params),
    enabled: classPublicId !== null && enabled,
  });
}

export function useTeacherCandidates(
  classPublicId: string | null,
  params: CandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });

  return useQuery({
    queryKey: classPublicId
      ? queryKeys.classes.teacherCandidates(classPublicId, normalized)
      : ['classes', null, 'teacher-candidates'],
    queryFn: () => catalogApi.listTeacherCandidates(classPublicId!, params),
    enabled: classPublicId !== null && enabled,
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

export function useCourseDeletionImpact(courseId: number | null, enabled = true) {
  return useQuery({
    queryKey: courseId
      ? queryKeys.courses.deletionImpact(courseId)
      : ['courses', null, 'deletion-impact'],
    queryFn: () => catalogApi.getCourseDeletionImpact(courseId!),
    enabled: courseId !== null && enabled,
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
      void queryClient.invalidateQueries({
        queryKey: queryKeys.departments.programs(departmentId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      toast.success('Program created');
    },
  });
}

export function useCreateGlobalProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      payload,
    }: {
      departmentId: number;
      payload: CreateProgramRequest;
    }) => catalogApi.createProgram(departmentId, payload),
    onSuccess: (_createdProgram, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.departments.programs(variables.departmentId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.departments.list() });
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Unable to update program.'));
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

export function useAssignClassCourse(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TeacherAssignmentInput) => catalogApi.assignCourse(classPublicId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      toast.success('Course assigned');
    },
  });
}

export function useTransferClassStudent(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentPublicId: string) => catalogApi.transferStudent(classPublicId, studentPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.students(classPublicId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.classes.studentCandidates(classPublicId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Student transferred');
    },
  });
}

export function useReplaceCourseTeacher(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, teacherPublicId }: { courseId: number; teacherPublicId: string }) =>
      catalogApi.replaceCourseTeacher(classPublicId, courseId, teacherPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Teacher replaced');
    },
  });
}

export function useRemoveClassCourse(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: number) => catalogApi.removeClassCourse(classPublicId, courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      toast.success('Course removed');
    },
  });
}

export function useAdvanceSemester(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teacherAssignments: TeacherAssignmentInput[]) =>
      catalogApi.advanceSemester(classPublicId, teacherAssignments),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Semester advanced');
    },
  });
}

export function useGraduateClass(classPublicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => catalogApi.graduateClass(classPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.detail(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.courses(classPublicId) });
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
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Unable to update course.'));
    },
  });
}

export function useAddCurriculum(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddCurriculumRequest) => catalogApi.addCurriculum(programId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.programs.curriculumRoot(programId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success('Curriculum entry added');
    },
  });
}

export function useBulkAddCurriculum(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkAddCurriculumRequest) =>
      catalogApi.bulkAddCurriculum(programId, payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.programs.curriculumRoot(programId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success(
        result.skippedCourseIds.length > 0
          ? `Added ${result.addedCount} curriculum course(s); skipped ${result.skippedCourseIds.length} duplicate(s)`
          : `Added ${result.addedCount} curriculum course(s)`,
      );
    },
  });
}

export function useCopyCurriculumBatch(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CopyCurriculumBatchRequest) =>
      catalogApi.copyCurriculumBatch(programId, payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.programs.curriculumRoot(programId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success(
        result.skippedCourseIds.length > 0
          ? `Copied ${result.addedCount} course(s); skipped ${result.skippedCourseIds.length} duplicate(s)`
          : `Copied ${result.addedCount} course(s)`,
      );
    },
  });
}

export function useRemoveCurriculum(programId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (curriculumId: number) => catalogApi.removeCurriculum(programId, curriculumId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.programs.curriculumRoot(programId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      toast.success('Curriculum entry removed');
    },
  });
}
