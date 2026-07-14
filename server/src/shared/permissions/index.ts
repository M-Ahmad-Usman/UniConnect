import { prisma } from "../../config/prisma.js";
import {
  activePlatformRoleAssignmentWhere,
  activeStaffRoleAssignmentWhere,
} from "../roles/index.js";

export interface GlobalPermissions {
  canAccessAdminDashboard: boolean;
  canAccessAcademicWorkspace: boolean;
  canAccessTeachingWorkspace: boolean;
  canBulkAdvanceSemester: boolean;
  canAccessEnrollmentWorkspace: boolean;
  canAccessRoleManagement: boolean;
  canManageUsers: boolean;
  canManageEnrollment: boolean;
  canManageCurriculum: boolean;
  canCreateCourse: boolean;
  canUpdateCourse: boolean;
  canCreateClass: boolean;
  canCreateSociety: boolean;
}

export interface ClassPermissions {
  canViewStudents: boolean;
  canManageStudents: boolean;
  canAssignCourses: boolean;
  canRemoveCourses: boolean;
  canReplaceCourseTeacher: boolean;
  canAdvanceSemester: boolean;
  canGraduate: boolean;
  canManageChannels: boolean;
  canAssignModerators: boolean;
}

export interface SocietyPermissions {
  canViewMembers: boolean;
  canManageMembers: boolean;
  canViewJoinRequests: boolean;
  canReviewJoinRequests: boolean;
  canEditInfo: boolean;
  canChangeLeadership: boolean;
  canManageChannels: boolean;
  canAssignModerators: boolean;
  canSubmitJoinRequest: boolean;
  canManageLifecycle: boolean;
}

export interface RoleWorkspacePermissions {
  canOpenRoleManagement: boolean;
  canAssignHod: boolean;
  canAssignProgramDirector: boolean;
  canAssignCR: boolean;
  canAssignSocietyPresident: boolean;
  canAssignSocietyConvenor: boolean;
  canAssignServerModerator: boolean;
  canAssignChannelModerator: boolean;
  canRevokeRoles: boolean;
}

export interface PermissionScopeSummary {
  hodDepartmentIds: number[];
  directedProgramIds: number[];
  crClassIds: number[];
  societyLeadershipIds: number[];
  moderatorServerIds: number[];
  moderatorChannelIds: number[];
  staffRoleNames: string[];
  enrollmentOfficerDepartmentIds: number[];
}

export interface PermissionContext {
  user: {
    id: number;
    userType: string;
    departmentId: number | null;
    status: string;
  } | null;
  scopes: PermissionScopeSummary;
  hodServerIds: number[];
  directedProgramDepartmentIds: number[];
  directedProgramServerIds: number[];
  crServerIds: number[];
  societyLeadershipServerIds: number[];
  isAdmin: boolean;
}

export interface ClassPermissionTarget {
  id: number;
  serverId: number;
  crId: number | null;
  programId: number;
  departmentId: number;
  status?: string;
}

export interface SocietyPermissionTarget {
  id: number;
  serverId: number;
  departmentId: number;
  status: string;
  isDeleted: boolean;
  presidentUserId: number;
  convenorUserId: number;
  departmentHodId: number | null;
}

export interface SocietyViewerState {
  isMember: boolean;
  requestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}

export function emptyGlobalPermissions(): GlobalPermissions {
  return {
    canAccessAdminDashboard: false,
    canAccessAcademicWorkspace: false,
    canAccessTeachingWorkspace: false,
    canBulkAdvanceSemester: false,
    canAccessEnrollmentWorkspace: false,
    canAccessRoleManagement: false,
    canManageUsers: false,
    canManageEnrollment: false,
    canManageCurriculum: false,
    canCreateCourse: false,
    canUpdateCourse: false,
    canCreateClass: false,
    canCreateSociety: false,
  };
}

export function emptyClassPermissions(): ClassPermissions {
  return {
    canViewStudents: false,
    canManageStudents: false,
    canAssignCourses: false,
    canRemoveCourses: false,
    canReplaceCourseTeacher: false,
    canAdvanceSemester: false,
    canGraduate: false,
    canManageChannels: false,
    canAssignModerators: false,
  };
}

export function emptySocietyPermissions(): SocietyPermissions {
  return {
    canViewMembers: false,
    canManageMembers: false,
    canViewJoinRequests: false,
    canReviewJoinRequests: false,
    canEditInfo: false,
    canChangeLeadership: false,
    canManageChannels: false,
    canAssignModerators: false,
    canSubmitJoinRequest: false,
    canManageLifecycle: false,
  };
}

export function emptyRoleWorkspacePermissions(): RoleWorkspacePermissions {
  return {
    canOpenRoleManagement: false,
    canAssignHod: false,
    canAssignProgramDirector: false,
    canAssignCR: false,
    canAssignSocietyPresident: false,
    canAssignSocietyConvenor: false,
    canAssignServerModerator: false,
    canAssignChannelModerator: false,
    canRevokeRoles: false,
  };
}

export async function getPermissionContext(userId: number): Promise<PermissionContext> {
  const now = new Date();
  const [
    user,
    hodDepartments,
    directedPrograms,
    crClasses,
    presidentSocieties,
    convenorSocieties,
    platformAssignments,
    staffAssignments,
  ] =
    await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true, userType: true, departmentId: true, status: true },
      }),
      prisma.department.findMany({
        where: { hodId: userId },
        select: { id: true, serverId: true },
      }),
      prisma.program.findMany({
        where: { programDirectorId: userId },
        select: {
          id: true,
          departmentId: true,
          department: { select: { serverId: true } },
        },
      }),
      prisma.class.findMany({
        where: { crId: userId },
        select: { id: true, serverId: true },
      }),
      prisma.society.findMany({
        where: { presidentId: userId, isDeleted: false },
        select: { id: true, serverId: true },
      }),
      prisma.society.findMany({
        where: { convenorId: userId, isDeleted: false },
        select: { id: true, serverId: true },
      }),
      prisma.userRoleAssignment.findMany({
        where: {
          AND: [activePlatformRoleAssignmentWhere(now), { userId }],
        },
        select: { serverId: true, channelId: true, scopeType: true },
      }),
      prisma.staffRoleAssignment.findMany({
        where: {
          AND: [activeStaffRoleAssignmentWhere(now), { userId }],
        },
        select: {
          departmentId: true,
          scopeType: true,
          role: { select: { name: true } },
        },
      }),
    ]);

  const societyLeadershipIds = uniqueNumbers([
    ...presidentSocieties.map((society) => society.id),
    ...convenorSocieties.map((society) => society.id),
  ]);
  const societyLeadershipServerIds = uniqueNumbers([
    ...presidentSocieties.map((society) => society.serverId),
    ...convenorSocieties.map((society) => society.serverId),
  ]);
  const moderatorServerIds = uniqueNumbers(
    platformAssignments.map((assignment) => assignment.serverId)
  );
  const moderatorChannelIds = uniqueNumbers(
    platformAssignments
      .filter((assignment) => assignment.scopeType === "CHANNEL" && assignment.channelId !== null)
      .map((assignment) => assignment.channelId)
  );
  const isAdmin = staffAssignments.some(
    (assignment) => assignment.role.name === "admin" && assignment.scopeType === "GLOBAL",
  );

  return {
    user,
    scopes: {
      hodDepartmentIds: hodDepartments.map((department) => department.id),
      directedProgramIds: directedPrograms.map((program) => program.id),
      crClassIds: crClasses.map((classRecord) => classRecord.id),
      societyLeadershipIds,
      moderatorServerIds,
      moderatorChannelIds,
      staffRoleNames: uniqueStrings(staffAssignments.map((assignment) => assignment.role.name)),
      enrollmentOfficerDepartmentIds: uniqueNumbers(
        staffAssignments
          .filter((assignment) => assignment.role.name === "enrollment_officer")
          .map((assignment) => assignment.departmentId),
      ),
    },
    hodServerIds: hodDepartments.map((department) => department.serverId),
    directedProgramDepartmentIds: directedPrograms.map((program) => program.departmentId),
    directedProgramServerIds: directedPrograms.map((program) => program.department.serverId),
    crServerIds: crClasses.map((classRecord) => classRecord.serverId),
    societyLeadershipServerIds,
    isAdmin,
  };
}

export function buildGlobalPermissions(context: PermissionContext): GlobalPermissions {
  if (!hasActiveUser(context)) {
    return emptyGlobalPermissions();
  }

  if (context.isAdmin) {
    return {
      canAccessAdminDashboard: true,
      canAccessAcademicWorkspace: true,
      canAccessTeachingWorkspace: false,
      canBulkAdvanceSemester: true,
      canAccessEnrollmentWorkspace: true,
      canAccessRoleManagement: true,
      canManageUsers: true,
      canManageEnrollment: true,
      canManageCurriculum: true,
      canCreateCourse: true,
      canUpdateCourse: true,
      canCreateClass: true,
      canCreateSociety: true,
    };
  }

  const isHod = context.scopes.hodDepartmentIds.length > 0;
  const isPd = context.scopes.directedProgramIds.length > 0;
  const isCr = context.scopes.crClassIds.length > 0;
  const isSocietyLeader = context.scopes.societyLeadershipIds.length > 0;
  const isEnrollmentOfficer = context.scopes.enrollmentOfficerDepartmentIds.length > 0;
  const canAccessRoleManagement = isHod || isPd || isCr || isSocietyLeader;

  return {
    canAccessAdminDashboard: false,
    canAccessAcademicWorkspace: isHod || isPd,
    canAccessTeachingWorkspace: context.user?.userType === "TEACHER",
    canBulkAdvanceSemester: isHod,
    canAccessEnrollmentWorkspace: isEnrollmentOfficer,
    canAccessRoleManagement,
    canManageUsers: false,
    canManageEnrollment: isEnrollmentOfficer,
    canManageCurriculum: isHod || isPd,
    canCreateCourse: isHod,
    canUpdateCourse: false,
    canCreateClass: false,
    canCreateSociety: isHod,
  };
}

export function buildRoleWorkspacePermissions(context: PermissionContext): RoleWorkspacePermissions {
  if (!hasActiveUser(context)) {
    return emptyRoleWorkspacePermissions();
  }

  if (context.isAdmin) {
    return {
      canOpenRoleManagement: true,
      canAssignHod: true,
      canAssignProgramDirector: true,
      canAssignCR: true,
      canAssignSocietyPresident: true,
      canAssignSocietyConvenor: true,
      canAssignServerModerator: true,
      canAssignChannelModerator: true,
      canRevokeRoles: true,
    };
  }

  const isHod = context.scopes.hodDepartmentIds.length > 0;
  const isPd = context.scopes.directedProgramIds.length > 0;
  const isCr = context.scopes.crClassIds.length > 0;
  const isSocietyLeader = context.scopes.societyLeadershipIds.length > 0;
  const canAssignModerators = isHod || isCr || isSocietyLeader;
  const canOpenRoleManagement = isHod || isPd || isCr || isSocietyLeader;

  return {
    canOpenRoleManagement,
    canAssignHod: false,
    canAssignProgramDirector: isHod,
    canAssignCR: isHod || isPd,
    canAssignSocietyPresident: isHod || isSocietyLeader,
    canAssignSocietyConvenor: isHod,
    canAssignServerModerator: canAssignModerators,
    canAssignChannelModerator: canAssignModerators,
    canRevokeRoles: canOpenRoleManagement,
  };
}

export function buildClassPermissions(
  context: PermissionContext,
  classRecord: ClassPermissionTarget | null
): ClassPermissions {
  if (!hasActiveUser(context) || !classRecord) {
    return emptyClassPermissions();
  }

  if (context.isAdmin) {
    return classRecord.status === "GRADUATED"
      ? readOnlyClassPermissions(true)
      : allClassPermissions();
  }

  const isHod = context.scopes.hodDepartmentIds.includes(classRecord.departmentId);
  if (isHod) {
    return {
      canViewStudents: true,
      canManageStudents: false,
      canAssignCourses: classRecord.status !== "GRADUATED",
      canRemoveCourses: classRecord.status !== "GRADUATED",
      canReplaceCourseTeacher: classRecord.status !== "GRADUATED",
      canAdvanceSemester: classRecord.status !== "GRADUATED",
      canGraduate: classRecord.status !== "GRADUATED",
      canManageChannels: classRecord.status !== "GRADUATED",
      canAssignModerators: classRecord.status !== "GRADUATED",
    };
  }

  const isPd = context.scopes.directedProgramIds.includes(classRecord.programId);
  const isCr = classRecord.crId === context.user.id || context.scopes.crClassIds.includes(classRecord.id);

  return {
    canViewStudents: false,
    canManageStudents: false,
    canAssignCourses: isPd && classRecord.status !== "GRADUATED",
    canRemoveCourses: isPd && classRecord.status !== "GRADUATED",
    canReplaceCourseTeacher: isPd && classRecord.status !== "GRADUATED",
    canAdvanceSemester: false,
    canGraduate: false,
    canManageChannels: isCr && classRecord.status !== "GRADUATED",
    canAssignModerators: isCr && classRecord.status !== "GRADUATED",
  };
}

export function buildSocietyPermissions(
  context: PermissionContext,
  society: SocietyPermissionTarget | null,
  viewer: SocietyViewerState
): SocietyPermissions {
  if (!hasActiveUser(context) || !society) {
    return emptySocietyPermissions();
  }

  const isAdmin = context.isAdmin;
  const isLeader =
    society.presidentUserId === context.user.id ||
    society.convenorUserId === context.user.id ||
    context.scopes.societyLeadershipIds.includes(society.id);
  const isHod = society.departmentHodId === context.user.id;
  const isWritable = society.status === "ACTIVE" && !society.isDeleted;
  const canManageLifecycle = isAdmin || isHod;

  if (isAdmin || isLeader) {
    return {
      canViewMembers: true,
      canManageMembers: isWritable,
      canViewJoinRequests: true,
      canReviewJoinRequests: isWritable,
      canEditInfo: isWritable,
      canChangeLeadership: isWritable,
      canManageChannels: isWritable,
      canAssignModerators: isWritable,
      canSubmitJoinRequest: false,
      canManageLifecycle,
    };
  }

  return {
    canViewMembers: viewer.isMember,
    canManageMembers: false,
    canViewJoinRequests: false,
    canReviewJoinRequests: false,
    canEditInfo: isHod && isWritable,
    canChangeLeadership: isHod && isWritable,
    canManageChannels: false,
    canAssignModerators: isHod && isWritable,
    canSubmitJoinRequest:
      isWritable &&
      context.user.userType === "STUDENT" &&
      !viewer.isMember &&
      viewer.requestStatus !== "PENDING" &&
      viewer.requestStatus !== "APPROVED",
    canManageLifecycle,
  };
}

function hasActiveUser(
  context: PermissionContext
): context is PermissionContext & { user: NonNullable<PermissionContext["user"]> } {
  return Boolean(context.user?.status === "ACTIVE");
}

function allClassPermissions(): ClassPermissions {
  return {
    canViewStudents: true,
    canManageStudents: true,
    canAssignCourses: true,
    canRemoveCourses: true,
    canReplaceCourseTeacher: true,
    canAdvanceSemester: true,
    canGraduate: true,
    canManageChannels: true,
    canAssignModerators: true,
  };
}

function readOnlyClassPermissions(canViewStudents: boolean): ClassPermissions {
  return {
    canViewStudents,
    canManageStudents: false,
    canAssignCourses: false,
    canRemoveCourses: false,
    canReplaceCourseTeacher: false,
    canAdvanceSemester: false,
    canGraduate: false,
    canManageChannels: false,
    canAssignModerators: false,
  };
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return [...new Set(values.filter((value): value is number => typeof value === "number"))];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
