import { prisma } from "../../config/prisma.js";
import { activePlatformRoleAssignmentWhere } from "../roles/index.js";

export interface GlobalPermissions {
  canAccessAdminDashboard: boolean;
  canAccessAcademicWorkspace: boolean;
  canAccessRoleManagement: boolean;
  canManageUsers: boolean;
  canManageCatalog: boolean;
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
}

export interface PermissionContext {
  user: {
    id: number;
    userType: string;
    departmentId: number | null;
    status: string;
    isActive: boolean;
  } | null;
  scopes: PermissionScopeSummary;
  hodServerIds: number[];
  directedProgramDepartmentIds: number[];
  directedProgramServerIds: number[];
  crServerIds: number[];
  societyLeadershipServerIds: number[];
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
  isActive: boolean;
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
    canAccessRoleManagement: false,
    canManageUsers: false,
    canManageCatalog: false,
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
  const [user, hodDepartments, directedPrograms, crClasses, presidentSocieties, convenorSocieties, platformAssignments] =
    await Promise.all([
      prisma.user.findFirst({
        where: { id: userId, isDeleted: false },
        select: { id: true, userType: true, departmentId: true, status: true, isActive: true },
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

  return {
    user,
    scopes: {
      hodDepartmentIds: hodDepartments.map((department) => department.id),
      directedProgramIds: directedPrograms.map((program) => program.id),
      crClassIds: crClasses.map((classRecord) => classRecord.id),
      societyLeadershipIds,
      moderatorServerIds,
      moderatorChannelIds,
    },
    hodServerIds: hodDepartments.map((department) => department.serverId),
    directedProgramDepartmentIds: directedPrograms.map((program) => program.departmentId),
    directedProgramServerIds: directedPrograms.map((program) => program.department.serverId),
    crServerIds: crClasses.map((classRecord) => classRecord.serverId),
    societyLeadershipServerIds,
  };
}

export function buildGlobalPermissions(context: PermissionContext): GlobalPermissions {
  if (!isActiveUser(context)) {
    return emptyGlobalPermissions();
  }

  if (context.user.userType === "ADMIN") {
    return {
      canAccessAdminDashboard: true,
      canAccessAcademicWorkspace: true,
      canAccessRoleManagement: true,
      canManageUsers: true,
      canManageCatalog: true,
      canCreateClass: true,
      canCreateSociety: true,
    };
  }

  const isHod = context.scopes.hodDepartmentIds.length > 0;
  const isPd = context.scopes.directedProgramIds.length > 0;
  const isCr = context.scopes.crClassIds.length > 0;
  const isSocietyLeader = context.scopes.societyLeadershipIds.length > 0;
  const canAccessRoleManagement = isHod || isPd || isCr || isSocietyLeader;

  return {
    canAccessAdminDashboard: false,
    canAccessAcademicWorkspace: isHod || isPd,
    canAccessRoleManagement,
    canManageUsers: false,
    canManageCatalog: isHod,
    canCreateClass: isHod,
    canCreateSociety: isHod,
  };
}

export function buildRoleWorkspacePermissions(context: PermissionContext): RoleWorkspacePermissions {
  if (!isActiveUser(context)) {
    return emptyRoleWorkspacePermissions();
  }

  if (context.user.userType === "ADMIN") {
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
  if (!isActiveUser(context) || !classRecord) {
    return emptyClassPermissions();
  }

  if (context.user.userType === "ADMIN") {
    return classRecord.status === "GRADUATED"
      ? readOnlyClassPermissions(true)
      : allClassPermissions();
  }

  const isHod = context.scopes.hodDepartmentIds.includes(classRecord.departmentId);
  if (isHod) {
    return classRecord.status === "GRADUATED"
      ? readOnlyClassPermissions(true)
      : allClassPermissions();
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
  if (!isActiveUser(context) || !society) {
    return emptySocietyPermissions();
  }

  const isAdmin = context.user.userType === "ADMIN";
  const isLeader =
    society.presidentUserId === context.user.id ||
    society.convenorUserId === context.user.id ||
    context.scopes.societyLeadershipIds.includes(society.id);
  const isHod = society.departmentHodId === context.user.id;

  if (isAdmin || isLeader) {
    return {
      canViewMembers: true,
      canManageMembers: true,
      canViewJoinRequests: true,
      canReviewJoinRequests: true,
      canEditInfo: true,
      canChangeLeadership: true,
      canManageChannels: true,
      canAssignModerators: true,
      canSubmitJoinRequest: false,
    };
  }

  return {
    canViewMembers: viewer.isMember,
    canManageMembers: false,
    canViewJoinRequests: false,
    canReviewJoinRequests: false,
    canEditInfo: isHod,
    canChangeLeadership: isHod,
    canManageChannels: false,
    canAssignModerators: isHod,
    canSubmitJoinRequest:
      society.isActive &&
      context.user.userType === "STUDENT" &&
      !viewer.isMember &&
      viewer.requestStatus !== "PENDING" &&
      viewer.requestStatus !== "APPROVED",
  };
}

function isActiveUser(
  context: PermissionContext
): context is PermissionContext & { user: NonNullable<PermissionContext["user"]> } {
  return Boolean(context.user?.isActive && context.user.status === "ACTIVE");
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
