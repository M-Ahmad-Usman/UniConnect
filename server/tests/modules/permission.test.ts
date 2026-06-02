import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  addServerMembership,
  assignCR,
  assignHOD,
  assignPD,
  createClass,
  createCourse,
  createDepartment,
  createProgram,
  createSociety,
  createSocietyMembershipRequest,
  createStudentWithInfo,
  createTeacherWithInfo,
  createTeachesRecord,
  createUser,
  loginAs,
} from "../helpers/factory.js";

let uidCounter = 0;
function uid(): string {
  uidCounter += 1;
  return uidCounter.toString(36);
}

beforeAll(async () => {
  await resetDB();
});

describe("Module 1 - Permission Policy Foundation", () => {
  it("returns global permission bootstrap for admin, HOD, PD, CR, society leadership, and ordinary student", async () => {
    const fixture = await createPermissionFixture();

    const adminPermissions = await getMyPermissions(fixture.admin.email);
    expect(adminPermissions.global).toEqual({
      canAccessAdminDashboard: true,
      canAccessAcademicWorkspace: true,
      canAccessRoleManagement: true,
      canManageUsers: true,
      canManageCurriculum: true,
      canCreateCourse: true,
      canUpdateCourse: true,
      canCreateClass: true,
      canCreateSociety: true,
    });
    expect(adminPermissions.roleWorkspace.canAssignHod).toBe(true);

    const hodPermissions = await getMyPermissions(fixture.hod.email);
    expect(hodPermissions.global.canAccessAcademicWorkspace).toBe(true);
    expect(hodPermissions.global.canManageCurriculum).toBe(true);
    expect(hodPermissions.global.canCreateCourse).toBe(true);
    expect(hodPermissions.global.canUpdateCourse).toBe(false);
    expect(hodPermissions.global.canCreateClass).toBe(true);
    expect(hodPermissions.global.canCreateSociety).toBe(true);
    expect(hodPermissions.global.canManageUsers).toBe(false);
    expect(hodPermissions.scopes.hodDepartmentIds).toContain(fixture.department.id);
    expect(hodPermissions.roleWorkspace.canAssignProgramDirector).toBe(true);

    const pdPermissions = await getMyPermissions(fixture.pd.email);
    expect(pdPermissions.global.canAccessAcademicWorkspace).toBe(true);
    expect(pdPermissions.global.canManageCurriculum).toBe(false);
    expect(pdPermissions.global.canCreateCourse).toBe(false);
    expect(pdPermissions.global.canCreateClass).toBe(false);
    expect(pdPermissions.roleWorkspace.canOpenRoleManagement).toBe(true);
    expect(pdPermissions.roleWorkspace.canAssignCR).toBe(true);
    expect(pdPermissions.roleWorkspace.canAssignServerModerator).toBe(false);

    const crPermissions = await getMyPermissions(fixture.cr.email);
    expect(crPermissions.global.canAccessAcademicWorkspace).toBe(false);
    expect(crPermissions.global.canAccessRoleManagement).toBe(true);
    expect(crPermissions.roleWorkspace.canAssignServerModerator).toBe(true);
    expect(crPermissions.roleWorkspace.canAssignCR).toBe(false);

    const convenorPermissions = await getMyPermissions(fixture.convenor.email);
    expect(convenorPermissions.global.canAccessRoleManagement).toBe(true);
    expect(convenorPermissions.roleWorkspace.canAssignServerModerator).toBe(true);
    expect(convenorPermissions.scopes.societyLeadershipIds).toBeUndefined();

    const studentPermissions = await getMyPermissions(fixture.nonMemberStudent.email);
    expect(studentPermissions.global.canAccessAdminDashboard).toBe(false);
    expect(studentPermissions.global.canAccessAcademicWorkspace).toBe(false);
    expect(studentPermissions.global.canAccessRoleManagement).toBe(false);
    expect(studentPermissions.roleWorkspace.canOpenRoleManagement).toBe(false);
  });

  it("returns caller-specific class detail permissions", async () => {
    const fixture = await createPermissionFixture();

    const admin = await getClassDetail(fixture.classRecord.publicId, fixture.admin.email);
    expect(admin.permissions.canManageStudents).toBe(true);
    expect(admin.permissions.canAdvanceSemester).toBe(true);
    expect(admin.permissions.canManageChannels).toBe(true);

    const hod = await getClassDetail(fixture.classRecord.publicId, fixture.hod.email);
    expect(hod.permissions.canManageStudents).toBe(true);
    expect(hod.permissions.canAssignCourses).toBe(true);
    expect(hod.permissions.canAdvanceSemester).toBe(true);
    expect(hod.permissions.canAssignModerators).toBe(true);

    const pd = await getClassDetail(fixture.classRecord.publicId, fixture.pd.email);
    expect(pd.permissions.canAssignCourses).toBe(true);
    expect(pd.permissions.canRemoveCourses).toBe(true);
    expect(pd.permissions.canReplaceCourseTeacher).toBe(true);
    expect(pd.permissions.canManageStudents).toBe(false);
    expect(pd.permissions.canAdvanceSemester).toBe(false);
    expect(pd.permissions.canGraduate).toBe(false);

    await expectClassDetailForbidden(fixture.classRecord.publicId, fixture.cr.email);
    await expectClassDetailForbidden(fixture.classRecord.publicId, fixture.assignedTeacher.email);
    await expectClassDetailForbidden(fixture.classRecord.publicId, fixture.unrelatedTeacher.email);
  });

  it("returns caller-specific society viewer state and permissions", async () => {
    const fixture = await createPermissionFixture();

    const admin = await getSocietyDetail(fixture.society.publicId, fixture.admin.email);
    expect(admin.viewer.isMember).toBe(false);
    expect(admin.permissions.canViewMembers).toBe(true);
    expect(admin.permissions.canChangeLeadership).toBe(true);
    expect(admin.permissions.canSubmitJoinRequest).toBe(false);

    const hod = await getSocietyDetail(fixture.society.publicId, fixture.hod.email);
    expect(hod.viewer.isMember).toBe(false);
    expect(hod.permissions.canChangeLeadership).toBe(true);
    expect(hod.permissions.canEditInfo).toBe(true);
    expect(hod.permissions.canAssignModerators).toBe(true);
    expect(hod.permissions.canViewMembers).toBe(false);
    expect(hod.permissions.canViewJoinRequests).toBe(false);

    const president = await getSocietyDetail(fixture.society.publicId, fixture.president.email);
    expect(president.viewer.isMember).toBe(true);
    expect(president.permissions.canManageMembers).toBe(true);
    expect(president.permissions.canReviewJoinRequests).toBe(true);
    expect(president.permissions.canManageChannels).toBe(true);

    const convenor = await getSocietyDetail(fixture.society.publicId, fixture.convenor.email);
    expect(convenor.viewer.isMember).toBe(true);
    expect(convenor.permissions.canManageMembers).toBe(true);
    expect(convenor.permissions.canAssignModerators).toBe(true);

    const member = await getSocietyDetail(fixture.society.publicId, fixture.member.email);
    expect(member.viewer.isMember).toBe(true);
    expect(member.permissions.canViewMembers).toBe(true);
    expect(member.permissions.canManageMembers).toBe(false);
    expect(member.permissions.canViewJoinRequests).toBe(false);

    const nonMemberStudent = await getSocietyDetail(
      fixture.society.publicId,
      fixture.nonMemberStudent.email,
    );
    expect(nonMemberStudent.viewer).toEqual({ isMember: false, requestStatus: "PENDING" });
    expect(nonMemberStudent.permissions.canSubmitJoinRequest).toBe(false);
    expect(nonMemberStudent.permissions.canViewMembers).toBe(false);

    const unrelatedTeacher = await getSocietyDetail(
      fixture.society.publicId,
      fixture.unrelatedTeacher.email,
    );
    expect(unrelatedTeacher.viewer.isMember).toBe(false);
    expect(unrelatedTeacher.permissions.canViewMembers).toBe(false);
    expect(unrelatedTeacher.permissions.canSubmitJoinRequest).toBe(false);
  });

  it("still denies manipulated mutation attempts despite read capability payloads", async () => {
    const fixture = await createPermissionFixture();
    const cookies = await loginAs(fixture.cr.email, "Pass@1234");

    const res = await request(app)
      .post(`/api/classes/${fixture.classRecord.publicId}/courses`)
      .set("Cookie", cookies)
      .send({ courseId: fixture.course.id, teacherPublicId: fixture.assignedTeacher.publicId });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

async function createPermissionFixture() {
  const admin = await createUser({
    email: `admin-perm-${uid()}@test.com`,
    password: "Pass@1234",
    userType: "ADMIN",
  });
  const department = await createDepartment({ code: `PERM-${uid()}`, creatorId: admin.id });
  const program = await createProgram(department.id, { code: `PRM-${uid()}`, semesters: 8 });
  const classRecord = await createClass(program.id, { creatorId: admin.id });

  const hod = await createTeacherWithInfo(department.id, {
    email: `hod-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  await assignHOD(department.id, hod.id);

  const pd = await createTeacherWithInfo(department.id, {
    email: `pd-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  await assignPD(program.id, pd.id);

  const cr = await createStudentWithInfo(classRecord.id, department.id, {
    email: `cr-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  await assignCR(classRecord.id, cr.id);

  const assignedTeacher = await createTeacherWithInfo(department.id, {
    email: `teacher-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  const course = await createCourse(department.id, { code: `CP-${uid()}` });
  await createTeachesRecord(assignedTeacher.id, course.id, classRecord.id);

  const unrelatedDepartment = await createDepartment({ code: `UP-${uid()}`, creatorId: admin.id });
  const unrelatedTeacher = await createTeacherWithInfo(unrelatedDepartment.id, {
    email: `unrelated-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });

  const president = await createStudentWithInfo(classRecord.id, department.id, {
    email: `pres-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  const convenor = await createTeacherWithInfo(department.id, {
    email: `conv-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  const { society, server } = await createSociety(department.id, president.id, convenor.id, {
    name: `Permission Society ${uid()}`,
    creatorId: admin.id,
  });

  const member = await createStudentWithInfo(classRecord.id, department.id, {
    email: `member-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  await addServerMembership(member.id, server.id);

  const nonMemberStudent = await createStudentWithInfo(classRecord.id, department.id, {
    email: `nonmember-perm-${uid()}@test.com`,
    password: "Pass@1234",
  });
  await createSocietyMembershipRequest(society.id, nonMemberStudent.id, "PENDING");

  return {
    admin,
    department,
    program,
    classRecord,
    hod,
    pd,
    cr,
    assignedTeacher,
    course,
    unrelatedTeacher,
    president,
    convenor,
    society,
    member,
    nonMemberStudent,
  };
}

async function getMyPermissions(email: string) {
  const cookies = await loginAs(email, "Pass@1234");
  const res = await request(app).get("/api/permissions/me").set("Cookie", cookies);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.headers["cache-control"]).toContain("no-store");

  return res.body.data;
}

async function getClassDetail(classPublicId: string, email: string) {
  const cookies = await loginAs(email, "Pass@1234");
  const res = await request(app).get(`/api/classes/${classPublicId}`).set("Cookie", cookies);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  return res.body.data;
}

async function expectClassDetailForbidden(classPublicId: string, email: string) {
  const cookies = await loginAs(email, "Pass@1234");
  const res = await request(app).get(`/api/classes/${classPublicId}`).set("Cookie", cookies);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe("SCOPE_FORBIDDEN");
}

async function getSocietyDetail(societyPublicId: string, email: string) {
  const cookies = await loginAs(email, "Pass@1234");
  const res = await request(app).get(`/api/societies/${societyPublicId}`).set("Cookie", cookies);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  return res.body.data;
}
