import { prisma } from "../../config/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/index.js";
import * as notificationService from "../notification/notification.service.js";

// ─── Types ─────────────────────────────────────────────────────────────────

type AssignRoleInput = {
  userId: number;
  role: string;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type ModeratorRole = "server_moderator" | "channel_moderator";

type RevokeRoleInput = {
  userId: number;
  role: string;
  scopeId?: number;
  serverId?: number;
  channelId?: number;
};

type CallerInfo = {
  id: number;
  userType: string;
  departmentId: number | null;
};

async function notifyRoleAssigned(
  userId: number,
  role: string,
  serverId: number,
  channelId?: number | null
): Promise<void> {
  try {
    await notificationService.createRoleAssignedNotification({
      userId,
      role,
      serverId,
      channelId,
    });
  } catch (error) {
    console.error("[RoleService] Failed to create role assignment notification:", error);
  }
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function findActiveUserOrThrow(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      userType: true,
      isActive: true,
      departmentId: true,
      studentInfo: { select: { studentId: true, classId: true } },
      teacherInfo: { select: { teacherId: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new NotFoundError("User not found or inactive");
  }

  return user;
}

function assertTeacher(user: Awaited<ReturnType<typeof findActiveUserOrThrow>>) {
  if (user.userType !== "TEACHER" || !user.teacherInfo) {
    throw new ValidationError("Target user must be a teacher for this role");
  }
}

function assertStudent(user: Awaited<ReturnType<typeof findActiveUserOrThrow>>) {
  if (user.userType !== "STUDENT" || !user.studentInfo) {
    throw new ValidationError("Target user must be a student for this role");
  }
}

// ─── Authorization Helpers ─────────────────────────────────────────────────

/**
 * Resolve the department ID that the caller (HOD) heads.
 * Returns null if caller is not HOD of any department.
 */
async function getCallerHODDepartmentId(callerId: number): Promise<number | null> {
  const dept = await prisma.department.findFirst({
    where: { hodId: callerId },
    select: { id: true },
  });
  return dept?.id ?? null;
}

/**
 * Resolve the program that the caller (PD) directs.
 * Returns null if caller is not PD of any program.
 */
async function getCallerPDProgram(callerId: number) {
  return prisma.program.findFirst({
    where: { programDirectorId: callerId },
    select: { id: true, departmentId: true },
  });
}

/**
 * Get the class that the caller is CR of.
 */
async function getCallerCRClass(callerId: number) {
  return prisma.class.findFirst({
    where: { crId: callerId },
    select: { id: true, serverId: true },
  });
}

/**
 * Get the society where the caller is president or convenor.
 */
async function getCallerSocietyLeadership(callerId: number) {
  return prisma.society.findFirst({
    where: {
      OR: [{ presidentId: callerId }, { convenorId: callerId }],
    },
    select: { id: true, serverId: true },
  });
}

// ─── Assign Authorization ──────────────────────────────────────────────────

async function assertCallerCanAssignHOD(caller: CallerInfo): Promise<void> {
  if (caller.userType === "ADMIN") return;
  throw new ForbiddenError("Only admin can assign the HOD role");
}

async function assertCallerCanAssignPD(
  caller: CallerInfo,
  targetDepartmentId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign PD within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetDepartmentId) return;

  throw new ForbiddenError("Insufficient permissions to assign program director");
}

async function assertCallerCanAssignCR(
  caller: CallerInfo,
  targetClassDepartmentId: number,
  targetClassProgramId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign CR within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetClassDepartmentId) return;

  // PD can assign CR within their program
  const pdProgram = await getCallerPDProgram(caller.id);
  if (pdProgram && pdProgram.id === targetClassProgramId) return;

  throw new ForbiddenError("Insufficient permissions to assign CR");
}

async function assertCallerCanAssignSocietyPresident(
  caller: CallerInfo,
  targetDepartmentId: number,
  targetSocietyId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign president within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetDepartmentId) return;

  // Convenor can assign president only within their own society
  const society = await prisma.society.findFirst({
    where: { convenorId: caller.id },
    select: { id: true },
  });
  if (society && society.id === targetSocietyId) return;

  throw new ForbiddenError("Insufficient permissions to assign society president");
}

async function assertCallerCanAssignSocietyConvenor(
  caller: CallerInfo,
  targetDepartmentId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign convenor within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId === targetDepartmentId) return;

  throw new ForbiddenError("Insufficient permissions to assign society convenor");
}

async function assertCallerCanAssignModerator(
  caller: CallerInfo,
  targetServerId: number
): Promise<void> {
  if (caller.userType === "ADMIN") return;

  // HOD can assign moderator in servers within their department
  const hodDeptId = await getCallerHODDepartmentId(caller.id);
  if (hodDeptId) {
    // Check if the target server belongs to their department (dept server, class server, or society server)
    const deptServer = await prisma.department.findFirst({
      where: { id: hodDeptId, serverId: targetServerId },
    });
    if (deptServer) return;

    const classServer = await prisma.class.findFirst({
      where: {
        serverId: targetServerId,
        program: { departmentId: hodDeptId },
      },
    });
    if (classServer) return;

    const societyServer = await prisma.society.findFirst({
      where: { serverId: targetServerId, departmentId: hodDeptId },
    });
    if (societyServer) return;
  }

  // CR can assign moderator in their class server
  const crClass = await getCallerCRClass(caller.id);
  if (crClass && crClass.serverId === targetServerId) return;

  // Society convenor/president can assign moderator in their society server
  const societyLeadership = await getCallerSocietyLeadership(caller.id);
  if (societyLeadership && societyLeadership.serverId === targetServerId) return;

  throw new ForbiddenError("Insufficient permissions to assign moderator");
}

// ─── Assign Role ───────────────────────────────────────────────────────────

export async function assignRole(input: AssignRoleInput, caller: CallerInfo) {
  const targetUser = await findActiveUserOrThrow(input.userId);

  switch (input.role) {
    case "hod": {
      const result = await assignHOD(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "program_director": {
      const result = await assignProgramDirector(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "cr": {
      const result = await assignCR(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "society_president": {
      const result = await assignSocietyPresident(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "society_convenor": {
      const result = await assignSocietyConvenor(input.scopeId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "server_moderator": {
      const result = await assignModerator("server_moderator", input.serverId!, undefined, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId);
      return result;
    }
    case "channel_moderator": {
      const result = await assignModerator("channel_moderator", input.serverId!, input.channelId!, targetUser, caller);
      await notifyRoleAssigned(result.userId, result.role, result.serverId, result.channelId);
      return result;
    }
    default:
      throw new ValidationError("Unknown role");
  }
}

async function assignHOD(
  departmentId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertTeacher(targetUser);
  await assertCallerCanAssignHOD(caller);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, hodId: true, serverId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (department.hodId) {
    throw new ConflictError("Department already has an HOD assigned. Revoke the current HOD first");
  }

  // Verify teacher belongs to this department
  if (targetUser.departmentId !== departmentId) {
    throw new ValidationError("Teacher must belong to the target department");
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { hodId: targetUser.id },
  });

  return {
    role: "hod",
    userId: targetUser.id,
    departmentId,
    departmentName: department.name,
    serverId: department.serverId,
  };
}

async function assignProgramDirector(
  programId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertTeacher(targetUser);

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      code: true,
      departmentId: true,
      programDirectorId: true,
      department: { select: { serverId: true } },
    },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertCallerCanAssignPD(caller, program.departmentId);

  if (program.programDirectorId) {
    throw new ConflictError("Program already has a Program Director assigned. Revoke the current PD first");
  }

  // Verify teacher belongs to the program's department
  if (targetUser.departmentId !== program.departmentId) {
    throw new ValidationError("Teacher must belong to the program's department");
  }

  await prisma.program.update({
    where: { id: programId },
    data: { programDirectorId: targetUser.id },
  });

  return {
    role: "program_director",
    userId: targetUser.id,
    programId,
    programCode: program.code,
    serverId: program.department.serverId,
  };
}

async function assignCR(
  classId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertStudent(targetUser);

  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      crId: true,
      serverId: true,
      program: { select: { id: true, departmentId: true } },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(caller, classRecord.program.departmentId, classRecord.program.id);

  if (classRecord.crId) {
    throw new ConflictError("Class already has a CR assigned. Revoke the current CR first");
  }

  // Verify student belongs to this class
  if (targetUser.studentInfo!.classId !== classId) {
    throw new ValidationError("Student must belong to the target class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: targetUser.id },
  });

  return { role: "cr", userId: targetUser.id, classId, serverId: classRecord.serverId };
}

async function assignSocietyPresident(
  societyId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertStudent(targetUser);

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { id: true, name: true, departmentId: true, presidentId: true, serverId: true },
  });

  if (!society) {
    throw new NotFoundError("Society not found");
  }

  await assertCallerCanAssignSocietyPresident(caller, society.departmentId, society.id);

  // Check if target user is a member of the society server
  const membership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId: targetUser.id, serverId: society.serverId },
    },
  });

  if (!membership) {
    throw new ValidationError("Student must be a member of the society");
  }

  // Update president (replaces existing — society always has a president)
  await prisma.society.update({
    where: { id: societyId },
    data: { presidentId: targetUser.id },
  });

  return {
    role: "society_president",
    userId: targetUser.id,
    societyId,
    societyName: society.name,
    serverId: society.serverId,
  };
}

async function assignSocietyConvenor(
  societyId: number,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  assertTeacher(targetUser);

  const society = await prisma.society.findUnique({
    where: { id: societyId },
    select: { id: true, name: true, departmentId: true, convenorId: true, serverId: true },
  });

  if (!society) {
    throw new NotFoundError("Society not found");
  }

  await assertCallerCanAssignSocietyConvenor(caller, society.departmentId);

  // Verify teacher belongs to the society's department
  if (targetUser.departmentId !== society.departmentId) {
    throw new ValidationError("Teacher must belong to the society's department");
  }

  // Update convenor (replaces existing — society always has a convenor)
  // Also ensure the new convenor is a member of the society server
  await prisma.$transaction(async (tx) => {
    await tx.society.update({
      where: { id: societyId },
      data: { convenorId: targetUser.id },
    });

    // Ensure membership
    await tx.serverMembership.upsert({
      where: {
        userId_serverId: { userId: targetUser.id, serverId: society.serverId },
      },
      create: {
        userId: targetUser.id,
        serverId: society.serverId,
        isAutoJoined: true,
      },
      update: {},
    });
  });

  return {
    role: "society_convenor",
    userId: targetUser.id,
    societyId,
    societyName: society.name,
    serverId: society.serverId,
  };
}

async function assignModerator(
  role: ModeratorRole,
  serverId: number,
  channelId: number | undefined,
  targetUser: Awaited<ReturnType<typeof findActiveUserOrThrow>>,
  caller: CallerInfo
) {
  await assertCallerCanAssignModerator(caller, serverId);

  // Verify server exists
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { id: true, name: true, isActive: true },
  });

  if (!server || !server.isActive) {
    throw new NotFoundError("Server not found or inactive");
  }

  // Verify user is a member of the server
  const membership = await prisma.serverMembership.findUnique({
    where: {
      userId_serverId: { userId: targetUser.id, serverId },
    },
  });

  if (!membership) {
    throw new ValidationError("User must be a member of the server to be assigned as moderator");
  }

  // If channel-scoped, verify channel belongs to server
  if (role === "channel_moderator") {
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, serverId, isDeleted: false },
    });

    if (!channel) {
      throw new NotFoundError("Channel not found in this server");
    }
  }

  const scopeType = role === "channel_moderator" ? "CHANNEL" : "SERVER";

  // Check for existing assignment (NULL channelId doesn't trigger unique constraint in PostgreSQL)
  const existing = await prisma.moderatorAssignment.findFirst({
    where: {
      userId: targetUser.id,
      serverId,
      channelId: channelId ?? null,
    },
  });

  if (existing) {
    throw new ConflictError("User is already a moderator for this scope");
  }

  const assignment = await prisma.moderatorAssignment.create({
    data: {
      userId: targetUser.id,
      scopeType,
      serverId,
      channelId: channelId ?? null,
      assignedBy: caller.id,
    },
  });

  return {
    role,
    userId: targetUser.id,
    serverId,
    channelId: role === "channel_moderator" ? (channelId ?? null) : null,
    scopeType: scopeType.toLowerCase(),
    assignmentId: assignment.id,
  };
}

// ─── Revoke Role ───────────────────────────────────────────────────────────

export async function revokeRole(input: RevokeRoleInput, caller: CallerInfo) {
  switch (input.role) {
    case "hod":
      return revokeHOD(input.scopeId!, input.userId, caller);
    case "program_director":
      return revokeProgramDirector(input.scopeId!, input.userId, caller);
    case "cr":
      return revokeCR(input.scopeId!, input.userId, caller);
    case "server_moderator":
      return revokeModerator("server_moderator", input.serverId!, undefined, input.userId, caller);
    case "channel_moderator":
      return revokeModerator("channel_moderator", input.serverId!, input.channelId!, input.userId, caller);
    default:
      throw new ValidationError("Unknown role");
  }
}

async function revokeHOD(departmentId: number, userId: number, caller: CallerInfo) {
  await assertCallerCanAssignHOD(caller);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true, name: true, hodId: true },
  });

  if (!department) {
    throw new NotFoundError("Department not found");
  }

  if (department.hodId !== userId) {
    throw new NotFoundError("User is not the HOD of this department");
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { hodId: null },
  });

  return { role: "hod", userId, departmentId, departmentName: department.name };
}

async function revokeProgramDirector(programId: number, userId: number, caller: CallerInfo) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, code: true, departmentId: true, programDirectorId: true },
  });

  if (!program) {
    throw new NotFoundError("Program not found");
  }

  await assertCallerCanAssignPD(caller, program.departmentId);

  if (program.programDirectorId !== userId) {
    throw new NotFoundError("User is not the Program Director of this program");
  }

  await prisma.program.update({
    where: { id: programId },
    data: { programDirectorId: null },
  });

  return { role: "program_director", userId, programId, programCode: program.code };
}

async function revokeCR(classId: number, userId: number, caller: CallerInfo) {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      crId: true,
      program: { select: { id: true, departmentId: true } },
    },
  });

  if (!classRecord) {
    throw new NotFoundError("Class not found");
  }

  await assertCallerCanAssignCR(caller, classRecord.program.departmentId, classRecord.program.id);

  if (classRecord.crId !== userId) {
    throw new NotFoundError("User is not the CR of this class");
  }

  await prisma.class.update({
    where: { id: classId },
    data: { crId: null },
  });

  return { role: "cr", userId, classId };
}

async function revokeModerator(
  role: ModeratorRole,
  serverId: number,
  channelId: number | undefined,
  userId: number,
  caller: CallerInfo
) {
  await assertCallerCanAssignModerator(caller, serverId);

  const assignment = await prisma.moderatorAssignment.findFirst({
    where: {
      userId,
      serverId,
      channelId: channelId ?? null,
    },
  });

  if (!assignment) {
    throw new NotFoundError("Moderator assignment not found");
  }

  await prisma.moderatorAssignment.delete({
    where: { id: assignment.id },
  });

  return {
    role,
    userId,
    serverId,
    channelId: role === "channel_moderator" ? (channelId ?? null) : null,
    scopeType: assignment.scopeType.toLowerCase(),
  };
}

// ─── Get User Roles ────────────────────────────────────────────────────────

export async function getUserRoles(userId: number, caller: CallerInfo) {
  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, departmentId: true, isActive: true },
  });

  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  // Authorization: Admin unrestricted, HOD only within their department
  if (caller.userType !== "ADMIN") {
    const hodDeptId = await getCallerHODDepartmentId(caller.id);
    if (!hodDeptId) {
      throw new ForbiddenError("Insufficient permissions to view user roles");
    }
    if (targetUser.departmentId !== hodDeptId) {
      throw new ForbiddenError("You can only view roles for users in your department");
    }
  }

  // Query all role assignments in parallel
  const [hodDepartments, directedPrograms, crClasses, presidentSocieties, convenorSocieties, moderatorAssignments] =
    await Promise.all([
      prisma.department.findMany({
        where: { hodId: userId },
        select: { id: true, name: true },
      }),
      prisma.program.findMany({
        where: { programDirectorId: userId },
        select: { id: true, code: true },
      }),
      prisma.class.findMany({
        where: { crId: userId },
        select: { id: true, serverId: true },
      }),
      prisma.society.findMany({
        where: { presidentId: userId },
        select: { id: true, name: true },
      }),
      prisma.society.findMany({
        where: { convenorId: userId },
        select: { id: true, name: true },
      }),
      prisma.moderatorAssignment.findMany({
        where: { userId },
        select: { id: true, serverId: true, channelId: true, scopeType: true },
      }),
    ]);

  const roles: Array<Record<string, unknown>> = [];

  for (const dept of hodDepartments) {
    roles.push({ role: "hod", departmentId: dept.id, departmentName: dept.name });
  }

  for (const prog of directedPrograms) {
    roles.push({ role: "program_director", programId: prog.id, programCode: prog.code });
  }

  for (const cls of crClasses) {
    roles.push({ role: "cr", classId: cls.id });
  }

  for (const soc of presidentSocieties) {
    roles.push({ role: "society_president", societyId: soc.id, societyName: soc.name });
  }

  for (const soc of convenorSocieties) {
    roles.push({ role: "society_convenor", societyId: soc.id, societyName: soc.name });
  }

  for (const mod of moderatorAssignments) {
    roles.push({
      role: mod.scopeType === "CHANNEL" ? "channel_moderator" : "server_moderator",
      serverId: mod.serverId,
      channelId: mod.channelId,
      scopeType: mod.scopeType.toLowerCase(),
    });
  }

  return roles;
}
