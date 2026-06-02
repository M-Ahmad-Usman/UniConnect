import {
  buildGlobalPermissions,
  buildRoleWorkspacePermissions,
  getPermissionContext,
} from "../../shared/permissions/index.js";

export async function getMyPermissions(userId: number) {
  const context = await getPermissionContext(userId);

  return {
    global: buildGlobalPermissions(context),
    roleWorkspace: buildRoleWorkspacePermissions(context),
    scopes: {
      hodDepartmentIds: context.scopes.hodDepartmentIds,
    },
  };
}
