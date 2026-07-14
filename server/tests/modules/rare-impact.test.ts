import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  addServerMembership,
  createChannel,
  createCourse,
  createCurriculum,
  createDepartment,
  createPost,
  createProgram,
  createSociety,
  createStudentWithInfo,
  createTeacherWithInfo,
  createTeachesRecord,
  createUser,
  loginAs,
} from "../helpers/factory.js";

let suffix = 0;
function uid(): string {
  suffix += 1;
  return suffix.toString(36);
}

beforeAll(async () => {
  await resetDB();
});

describe("Rare deletion-impact reports", () => {
  it("reports department blockers with bounded previews and denies non-admins", async () => {
    const admin = await createUser({
      email: `admin-dept-impact-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const department = await createDepartment({ code: `DIMP-${uid()}` });
    const program = await createProgram(department.id);
    const klass = await createClassForProgram(program.id);
    const teacher = await createTeacherWithInfo(department.id, {
      email: `teacher-dept-impact-${uid()}@test.com`,
      password: "Pass@1234",
    });
    const student = await createStudentWithInfo(klass.id, department.id, {
      email: `student-dept-impact-${uid()}@test.com`,
      password: "Pass@1234",
    });
    await createSociety(department.id, student.id, teacher.id, {
      name: `Impact Society ${uid()}`,
      creatorId: admin.id,
    });
    const course = await createCourse(department.id, { code: `DIC-${uid()}` });
    await createCurriculum(program.id, course.id, 1, 2026);
    const channel = await createChannel(department.serverId, {
      name: `dept-impact-${uid()}`,
      type: "GENERAL",
      createdBy: admin.id,
    });
    await createPost(channel.id, admin.id);
    await Promise.all(
      Array.from({ length: 9 }, (_, index) =>
        createUser({
          email: `dept-extra-${uid()}-${index}@test.com`,
          userType: "STUDENT",
          departmentId: department.id,
        })
      )
    );

    const adminCookies = await loginAs(admin.email, "Pass@1234");
    const impact = await request(app)
      .get(`/api/departments/${department.id}/deletion-impact`)
      .set("Cookie", adminCookies);

    expect(impact.status).toBe(200);
    expect(impact.body.data.canDelete).toBe(false);
    expect(impact.body.data.checksComplete).toBe(true);
    expect(impact.body.data.pendingChecks).toEqual([]);
    expect(impact.body.data.blockers.programs.count).toBe(1);
    expect(impact.body.data.blockers.departmentUsers.count).toBe(11);
    expect(impact.body.data.blockers.departmentUsers.preview).toHaveLength(10);
    expect(impact.body.data.blockers.departmentUsers.hasMore).toBe(true);
    expect(impact.body.data.blockers.departmentUsers.byUserType.STUDENT).toBe(10);
    expect(impact.body.data.blockers.departmentUsers.byUserType.TEACHER).toBe(1);
    expect(impact.body.data.blockers.departmentUsers.preview[0]).not.toHaveProperty("id");
    expect(impact.body.data.blockers.societies.count).toBe(1);
    expect(impact.body.data.blockers.dependentCourses.count).toBe(1);
    expect(impact.body.data.communicationImpact.posts.count).toBe(1);

    const teacherCookies = await loginAs(teacher.email, "Pass@1234");
    const denied = await request(app)
      .get(`/api/departments/${department.id}/deletion-impact`)
      .set("Cookie", teacherCookies);
    expect(denied.status).toBe(403);
  });

  it("reports program blockers and communication cleanup impact", async () => {
    const admin = await createUser({
      email: `admin-program-impact-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const department = await createDepartment({ code: `PIMP-${uid()}` });
    const program = await createProgram(department.id, { code: `PIMP${uid()}` });
    const klass = await createClassForProgram(program.id);
    const course = await createCourse(department.id, { code: `PIC-${uid()}` });
    await createCurriculum(program.id, course.id, 1, 2026);
    const channel = await createChannel(department.serverId, {
      name: `program-impact-${uid()}`,
      type: "PROGRAM",
      programId: program.id,
      createdBy: admin.id,
    });
    await createPost(channel.id, admin.id);

    const cookies = await loginAs(admin.email, "Pass@1234");
    const impact = await request(app)
      .get(`/api/programs/${program.id}/deletion-impact`)
      .set("Cookie", cookies);

    expect(impact.status).toBe(200);
    expect(impact.body.data.canDelete).toBe(false);
    expect(impact.body.data.blockers.enrolledClasses.count).toBe(1);
    expect(impact.body.data.blockers.enrolledClasses.preview[0].publicId).toBe(klass.publicId);
    expect(impact.body.data.cleanupImpact.curriculumEntries.count).toBe(1);
    expect(impact.body.data.communicationImpact.channels.count).toBe(1);
    expect(impact.body.data.communicationImpact.posts.count).toBe(1);
  });

  it("completes class impact and does not treat communication history as a blocker", async () => {
    const admin = await createUser({
      email: `admin-class-impact-rare-impact-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const department = await createDepartment({ code: `CIMP-${uid()}` });
    const program = await createProgram(department.id);
    const klass = await createClassForProgram(program.id);
    const channel = await createChannel(klass.serverId, {
      name: `class-impact-${uid()}`,
      type: "GENERAL",
      createdBy: admin.id,
    });
    await addServerMembership(admin.id, klass.serverId);
    await createPost(channel.id, admin.id);

    const cookies = await loginAs(admin.email, "Pass@1234");
    const impact = await request(app)
      .get(`/api/classes/${klass.publicId}/deletion-impact`)
      .set("Cookie", cookies);

    expect(impact.status).toBe(200);
    expect(impact.body.data.canDelete).toBe(true);
    expect(impact.body.data.checksComplete).toBe(true);
    expect(impact.body.data.pendingChecks).toEqual([]);
    expect(impact.body.data.blockers.enrolledStudents.count).toBe(0);
    expect(impact.body.data.blockers.activeTeachingAssignments.count).toBe(0);
    expect(impact.body.data.communicationImpact.channels.count).toBe(1);
    expect(impact.body.data.communicationImpact.posts.count).toBe(1);
    expect(impact.body.data.communicationImpact.serverMemberships.count).toBe(1);
  });

  it("reports course blockers from curriculum, teaching assignments, and channels", async () => {
    const admin = await createUser({
      email: `admin-course-impact-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const department = await createDepartment({ code: `COIMP-${uid()}` });
    const program = await createProgram(department.id);
    const klass = await createClassForProgram(program.id);
    const teacher = await createTeacherWithInfo(department.id, {
      email: `teacher-course-impact-${uid()}@test.com`,
    });
    const course = await createCourse(department.id, { code: `COI-${uid()}` });
    await createCurriculum(program.id, course.id, 1, 2026);
    const assignment = await createTeachesRecord(teacher.id, course.id, klass.id);
    const channel = await prisma.channel.findUniqueOrThrow({
      where: { id: assignment.channelId },
      select: { id: true, publicId: true },
    });
    await createPost(channel.id, admin.id);

    const cookies = await loginAs(admin.email, "Pass@1234");
    const impact = await request(app)
      .get(`/api/courses/${course.id}/deletion-impact`)
      .set("Cookie", cookies);

    expect(impact.status).toBe(200);
    expect(impact.body.data.canDelete).toBe(false);
    expect(impact.body.data.blockers.curriculumEntries.count).toBe(1);
    expect(impact.body.data.blockers.activeTeachingAssignments.count).toBe(1);
    expect(
      impact.body.data.blockers.activeTeachingAssignments.preview[0].teacher.user.publicId
    ).toBe(teacher.publicId);
    expect(impact.body.data.blockers.courseChannels.count).toBe(1);
    expect(impact.body.data.blockers.courseChannels.preview[0].publicId).toBe(channel.publicId);
    expect(impact.body.data.communicationImpact.posts.count).toBe(1);
  });
});

async function createClassForProgram(programId: number) {
  const server = await prisma.server.create({
    data: {
      name: `Class Impact Server ${uid()}`,
      type: "CLASS",
      isDeleted: false,
    },
  });

  return prisma.class.create({
    data: {
      programId,
      currentSemester: 1,
      academicYear: 2026,
      admissionYear: 2026 + suffix,
      section: "A",
      serverId: server.id,
    },
  });
}
