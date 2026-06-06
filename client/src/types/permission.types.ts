export interface GlobalPermissions {
  canAccessAdminDashboard: boolean;
  canAccessAcademicWorkspace: boolean;
  canAccessRoleManagement: boolean;
  canManageUsers: boolean;
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
}

export interface MyPermissions {
  global: GlobalPermissions;
  roleWorkspace: RoleWorkspacePermissions;
  scopes: PermissionScopeSummary;
}
