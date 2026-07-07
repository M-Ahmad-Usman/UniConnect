import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { enrollmentApi } from '@/api/endpoints/enrollment.api';
import { queryKeys } from '@/lib/constants';
import type {
  EnrollmentCandidateParams,
  EnrollmentClassParams,
  EnrollmentCreateClassRequest,
  EnrollmentCreateStudentRequest,
  EnrollmentProgramParams,
} from '@/types';
import { userListParamsToRecord } from '@/features/admin/utils';

export function useEnrollmentBootstrap() {
  return useQuery({
    queryKey: queryKeys.enrollment.bootstrap(),
    queryFn: enrollmentApi.bootstrap,
  });
}

export function useEnrollmentPrograms(params: EnrollmentProgramParams, enabled = true) {
  const normalized = userListParamsToRecord({ ...params });
  return useQuery({
    queryKey: queryKeys.enrollment.programs(normalized),
    queryFn: () => enrollmentApi.listPrograms(params),
    enabled,
  });
}

export function useEnrollmentClasses(params: EnrollmentClassParams, enabled = true) {
  const normalized = userListParamsToRecord({ ...params });
  return useQuery({
    queryKey: queryKeys.enrollment.classes(normalized),
    queryFn: () => enrollmentApi.listClasses(params),
    enabled,
  });
}

export function useEnrollmentClass(classPublicId: string | null) {
  return useQuery({
    queryKey: classPublicId
      ? queryKeys.enrollment.classDetail(classPublicId)
      : ['enrollment', 'classes', null],
    queryFn: () => enrollmentApi.getClass(classPublicId!),
    enabled: classPublicId !== null,
  });
}

export function useEnrollmentClassStudents(
  classPublicId: string | null,
  params: EnrollmentCandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });
  return useQuery({
    queryKey: classPublicId
      ? queryKeys.enrollment.classStudents(classPublicId, normalized)
      : ['enrollment', 'classes', null, 'students'],
    queryFn: () => enrollmentApi.listClassStudents(classPublicId!, params),
    enabled: classPublicId !== null && enabled,
  });
}

export function useEnrollmentTransferCandidates(
  classPublicId: string | null,
  params: EnrollmentCandidateParams = {},
  enabled = true,
) {
  const normalized = userListParamsToRecord({ ...params });
  return useQuery({
    queryKey: classPublicId
      ? queryKeys.enrollment.transferCandidates(classPublicId, normalized)
      : ['enrollment', 'classes', null, 'transfer-candidates'],
    queryFn: () => enrollmentApi.listTransferCandidates(classPublicId!, params),
    enabled: classPublicId !== null && enabled,
  });
}

export function useCreateEnrollmentClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EnrollmentCreateClassRequest) => enrollmentApi.createClass(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classesRoot() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Class created');
    },
  });
}

export function useCreateEnrollmentStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EnrollmentCreateStudentRequest) => enrollmentApi.createStudent(payload),
    onSuccess: (_student, payload) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classesRoot() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment.classDetail(payload.classPublicId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment.classStudents(payload.classPublicId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Student created');
    },
  });
}

export function useTransferEnrollmentStudent(classPublicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentPublicId: string) =>
      enrollmentApi.transferStudent(classPublicId, studentPublicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classesRoot() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classDetail(classPublicId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classStudents(classPublicId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.enrollment.transferCandidates(classPublicId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Student transferred');
    },
  });
}

export function useImportEnrollmentStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      enrollmentApi.importStudents(file, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollment.classesRoot() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.classes.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() });
      toast.success('Student import completed');
    },
  });
}
