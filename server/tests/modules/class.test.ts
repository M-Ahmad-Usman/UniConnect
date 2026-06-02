import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createUser,
  createDepartment,
  createProgram,
  createClass,
  createTeacherWithInfo,
  createStudentWithInfo,
  createCourse,
  createCurriculum,
  assignHOD,
  loginAs,
} from "../helpers/factory.js";

/** Short unique suffix (max 9 chars) for codes that have length limits */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}
const UNKNOWN_PUBLIC_ID = "018f47a2-5d6b-7c8d-9e0f-123456789abc";

async function addCurrentCurriculum(
  programId: number,
  klass: { currentSemester: number; admissionYear: number },
  courseId: number
) {
  return createCurriculum(programId, courseId, klass.currentSemester, klass.admissionYear);
}

beforeAll(async () => {
  await resetDB();
});

describe("Module 7 - Class List Filters", () => {
  it("should filter classes by departmentId and section", async () => {
    const admin = await createUser({
      email: `admin-class-filter-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const deptA = await createDepartment({ code: `CFA-${uid()}` });
    const deptB = await createDepartment({ code: `CFB-${uid()}` });
    const programA = await createProgram(deptA.id, { semesters: 8 });
    const programB = await createProgram(deptB.id, { semesters: 8 });
    const classA = await createClass(programA.id, { section: "A" });
    await createClass(programA.id, { section: "B", currentSemester: 2 });
    await createClass(programB.id, { section: "A" });
    const cookies = await loginAs(admin.email, "Pass@1234");

    const res = await request(app)
      .get("/api/classes")
      .query({ departmentId: deptA.id, section: "A" })
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ publicId: classA.publicId, section: "A" })])
    );
    expect(
      res.body.data.every(
        (klass: { section: string; program: { department: { id: number } } }) =>
          klass.section === "A" && klass.program.department.id === deptA.id
      )
    ).toBe(true);
  });
});

describe("Module 7 - Class public boundary and deletion impact", () => {
  it("rejects numeric class route identifiers", async () => {
    const admin = await createUser({
      email: `admin-class-public-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const cookies = await loginAs(admin.email, "Pass@1234");
    const res = await request(app).get("/api/classes/1").set("Cookie", cookies);
    expect(res.status).toBe(400);
  });

  it("returns provisional blocker counts only to admins", async () => {
    const admin = await createUser({
      email: `admin-class-impact-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const department = await createDepartment({ code: `IMP-${uid()}` });
    const hod = await createTeacherWithInfo(department.id, {
      email: `hod-class-impact-${Date.now()}@test.com`,
      password: "Pass@1234",
    });
    await assignHOD(department.id, hod.id);
    const program = await createProgram(department.id);
    const klass = await createClass(program.id);
    await createStudentWithInfo(klass.id, department.id);
    const adminCookies = await loginAs(admin.email, "Pass@1234");

    const impact = await request(app)
      .get(`/api/classes/${klass.publicId}/deletion-impact`)
      .set("Cookie", adminCookies);
    expect(impact.status).toBe(200);
    expect(impact.body.data.canDelete).toBe(false);
    expect(impact.body.data.checksComplete).toBe(false);
    expect(impact.body.data.pendingChecks).toEqual(["COMMUNICATION_IMPACT"]);
    expect(impact.body.data.blockers.enrolledStudents.count).toBe(1);

    const hodCookies = await loginAs(hod.email, "Pass@1234");
    const denied = await request(app)
      .get(`/api/classes/${klass.publicId}/deletion-impact`)
      .set("Cookie", hodCookies);
    expect(denied.status).toBe(403);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 4 - Class Management", () => {
  // ─── POST /api/classes ───────────────────────────────────────────────

  describe("POST /api/classes", () => {
    it("should allow admin to create class with auto-created server, announcements, and general channels", async () => {
      const admin = await createUser({
        email: "admin-cls-create@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicId).toEqual(expect.any(String));
      expect(res.body.data).not.toHaveProperty("id");
      expect(res.body.data.currentSemester).toBe(1);
      expect(res.body.data.academicYear).toBe(2026);
      expect(res.body.data.admissionYear).toBe(2026);
      expect(res.body.data.section).toBe("A");
      expect(res.body.data.serverPublicId).toBeDefined();
      expect(res.body.data.program.id).toBe(program.id);

      // Verify server auto-created
      const server = await prisma.server.findUnique({
        where: { publicId: res.body.data.serverPublicId },
      });
      expect(server).not.toBeNull();
      expect(server!.type).toBe("CLASS");
      expect(server!.name).toContain(program.code);

      // Verify #announcements and #general channels auto-created
      const channels = await prisma.channel.findMany({
        where: { serverId: server!.id },
        orderBy: { name: "asc" },
      });
      expect(channels.length).toBe(2);

      const announcementsChannel = channels.find((c) => c.name === "announcements");
      expect(announcementsChannel).toBeDefined();
      expect(announcementsChannel!.type).toBe("ANNOUNCEMENT");
      expect(announcementsChannel!.isAutoCreated).toBe(true);

      const generalChannel = channels.find((c) => c.name === "general");
      expect(generalChannel).toBeDefined();
      expect(generalChannel!.type).toBe("GENERAL");
      expect(generalChannel!.isAutoCreated).toBe(true);
    });

    it("should allow HOD to create class in own department", async () => {
      const dept = await createDepartment({ code: `HOD-CLS-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cls-own-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      // Set this teacher as HOD
      await prisma.department.update({
        where: { id: dept.id },
        data: { hodId: hod.id },
      });

      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 2,
          academicYear: 2026,
          admissionYear: 2025,
          section: "A",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentSemester).toBe(2);
    });

    it("should return 403 when HOD creates class in other department", async () => {
      const ownDept = await createDepartment({ code: `HOD-OWN-${uid()}` });
      const otherDept = await createDepartment({ code: `HOD-OTH-${uid()}` });
      const hod = await createTeacherWithInfo(ownDept.id, {
        email: `hod-cls-other-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      // Set as HOD of own department only
      await prisma.department.update({
        where: { id: ownDept.id },
        data: { hodId: hod.id },
      });

      const otherProgram = await createProgram(otherDept.id, { semesters: 8 });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: otherProgram.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for teacher who is not HOD", async () => {
      const dept = await createDepartment({ code: `TCHR-CLS-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-nothod-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate class (program + semester + section + admissionYear)", async () => {
      const admin = await createUser({
        email: `admin-cls-dup-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `DUP-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 404 for non-existent program", async () => {
      const admin = await createUser({
        email: `admin-cls-noprog-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: 99999,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const admin = await createUser({
        email: `admin-cls-noflds-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app)
        .post("/api/classes")
        .send({
          programId: 1,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for student", async () => {
      const dept = await createDepartment({ code: `STU-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const student = await createUser({
        email: `student-cls-create-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 3,
          academicYear: 2026,
          admissionYear: 2026,
          section: "B",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject semester exceeding program's total semesters", async () => {
      const admin = await createUser({
        email: `admin-cls-badsem-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SEM-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 5,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/classes ────────────────────────────────────────────────

  describe("GET /api/classes", () => {
    it("should return paginated list of classes", async () => {
      const user = await createUser({
        email: `admin-cls-list-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get("/api/classes")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBeDefined();
      expect(res.body.pagination.totalPages).toBeDefined();
    });

    it("should filter by programId", async () => {
      const admin = await createUser({
        email: `admin-cls-filter-prog-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `FILT-P-${uid()}` });
      const program1 = await createProgram(dept.id, { semesters: 8 });
      const program2 = await createProgram(dept.id, { semesters: 6 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program1.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program2.id,
          currentSemester: 1,
          academicYear: 2026,
          admissionYear: 2026,
          section: "A",
        });

      const res = await request(app)
        .get(`/api/classes?programId=${program1.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      for (const cls of res.body.data) {
        expect(cls.program.id).toBe(program1.id);
      }
    });

    it("should filter by semester", async () => {
      const admin = await createUser({
        email: `admin-cls-filter-sem-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `FILT-S-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 3,
          academicYear: 2026,
          admissionYear: 2024,
          section: "A",
        });

      await request(app)
        .post("/api/classes")
        .set("Cookie", cookies)
        .send({
          programId: program.id,
          currentSemester: 5,
          academicYear: 2026,
          admissionYear: 2023,
          section: "A",
        });

      const res = await request(app)
        .get(`/api/classes?semester=3`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const cls of res.body.data) {
        expect(cls.currentSemester).toBe(3);
      }
    });
  });

  // ─── GET /api/classes/:id ────────────────────────────────────────────

  describe("GET /api/classes/:id", () => {
    it("should return class details with program, counts", async () => {
      const user = await createUser({
        email: `admin-cls-detail-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `DTL-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${klass.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicId).toBe(klass.publicId);
      expect(res.body.data).not.toHaveProperty("id");
      expect(res.body.data.currentSemester).toBeDefined();
      expect(res.body.data.program).toBeDefined();
      expect(res.body.data.program.code).toBeDefined();
      expect(res.body.data._count).toBeDefined();
      expect(res.body.data._count.students).toBeDefined();
      expect(res.body.data._count.teaches).toBeDefined();
    });

    it("should return 404 for non-existent class", async () => {
      const user = await createUser({
        email: `user-cls-404-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${UNKNOWN_PUBLIC_ID}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/classes/:id/courses ───────────────────────────────────

  describe("POST /api/classes/:id/courses", () => {
    it("should allow admin to assign course + teacher with auto-created course channel", async () => {
      const admin = await createUser({
        email: `admin-assign-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `ASN-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-assign-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `CRS-ASN-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.courseId).toBe(course.id);
      expect(res.body.data.teacherPublicId).toBe(teacher.publicId);
      expect(res.body.data.classPublicId).toBe(klass.publicId);
      expect(res.body.data).not.toHaveProperty("teacherId");
      expect(res.body.data).not.toHaveProperty("classId");
      expect(res.body.data.course).toBeDefined();
      expect(res.body.data.course.code).toBe(course.code);
      expect(res.body.data.teacher).toBeDefined();

      // Verify course channel auto-created in class server
      const channel = await prisma.channel.findFirst({
        where: {
          serverId: klass.serverId,
          courseId: course.id,
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.type).toBe("COURSE");
      expect(channel!.name).toBe(course.code);
      expect(channel!.isAutoCreated).toBe(true);

      // Verify teacher was auto-added to the class server
      const membership = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: {
            userId: teacher.id,
            serverId: klass.serverId,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership!.isAutoJoined).toBe(true);
    });

    it("should allow HOD to assign course in own department", async () => {
      const dept = await createDepartment({ code: `HOD-ASN-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-assign-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      await prisma.department.update({
        where: { id: dept.id },
        data: { hodId: hod.id },
      });

      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-hodassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `HOD-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should allow PD to assign course for own program", async () => {
      const dept = await createDepartment({ code: `PD-ASN-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-assign-${Date.now()}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id, { semesters: 8 });

      // Set as program director
      await prisma.program.update({
        where: { id: program.id },
        data: { programDirectorId: pd.id },
      });

      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-pdassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `PD-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should return 403 when HOD assigns in other department", async () => {
      const ownDept = await createDepartment({ code: `HOD-OWN-ASN-${uid()}` });
      const otherDept = await createDepartment({ code: `HOD-OTH-ASN-${uid()}` });
      const hod = await createTeacherWithInfo(ownDept.id, {
        email: `hod-otherassn-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      await prisma.department.update({
        where: { id: ownDept.id },
        data: { hodId: hod.id },
      });

      const otherProgram = await createProgram(otherDept.id, { semesters: 8 });
      const klass = await createClass(otherProgram.id);
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-othdeptassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(otherDept.id, { code: `OTH-CRS-${uid()}` });
      await addCurrentCurriculum(otherProgram.id, klass, course.id);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when PD assigns for other program", async () => {
      const dept = await createDepartment({ code: `PD-OTH-ASN-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-otherprog-${Date.now()}@test.com`,
        password: "Pass@1234",
      });
      const program1 = await createProgram(dept.id, { semesters: 8 });
      const program2 = await createProgram(dept.id, { semesters: 6 });

      // Set as PD of program1 only
      await prisma.program.update({
        where: { id: program1.id },
        data: { programDirectorId: pd.id },
      });

      // Try to assign course to a class from program2
      const klass = await createClass(program2.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-pdothprog-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `PDO-CRS-${uid()}` });
      await addCurrentCurriculum(program2.id, klass, course.id);
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate assignment", async () => {
      const admin = await createUser({
        email: `admin-dup-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `DUP-ASN-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-dupassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `DUP-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 409 when assigning same course to another teacher in the same class", async () => {
      const admin = await createUser({
        email: `admin-dup-teacher-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `DUP-TCHR-ASN-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacherA = await createTeacherWithInfo(dept.id, {
        email: `teacherA-dupassn-${Date.now()}@test.com`,
      });
      const teacherB = await createTeacherWithInfo(dept.id, {
        email: `teacherB-dupassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `DUPT-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacherA.publicId });

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacherB.publicId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 404 for non-existent class", async () => {
      const admin = await createUser({
        email: `admin-nocls-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `NOCLS-ASN-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-noclsassn-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `NOCLS-CRS-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${UNKNOWN_PUBLIC_ID}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent course", async () => {
      const admin = await createUser({
        email: `admin-nocrs-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `NOCRS-ASN-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-nocrsassn-${Date.now()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: 99999, teacherPublicId: teacher.publicId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent teacher", async () => {
      const admin = await createUser({
        email: `admin-notchr-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `NOTCHR-ASN-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const course = await createCourse(dept.id, { code: `NOTCHR-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: UNKNOWN_PUBLIC_ID });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when assigning a course from another department", async () => {
      const admin = await createUser({
        email: `admin-crossdept-assn-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const deptA = await createDepartment({ code: `CROSS-A-${uid()}` });
      const deptB = await createDepartment({ code: `CROSS-B-${uid()}` });
      const programA = await createProgram(deptA.id, { semesters: 8 });
      const klass = await createClass(programA.id);
      const teacherA = await createTeacherWithInfo(deptA.id, {
        email: `teacher-crossdept-${Date.now()}@test.com`,
      });
      const courseFromOtherDept = await createCourse(deptB.id, { code: `CROSS-CRS-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: courseFromOtherDept.id, teacherPublicId: teacherA.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow same course in multiple classes (different servers)", async () => {
      const admin = await createUser({
        email: `admin-multicls-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `MULTI-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const classA = await createClass(program.id, { section: "A" });
      const classB = await createClass(program.id, { section: "B" });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-multicls-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `MULTI-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, classA, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res1 = await request(app)
        .post(`/api/classes/${classA.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/classes/${classB.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(res2.status).toBe(201);

      // Verify separate channels exist in each class server
      const channelA = await prisma.channel.findFirst({
        where: { serverId: classA.serverId, courseId: course.id },
      });
      const channelB = await prisma.channel.findFirst({
        where: { serverId: classB.serverId, courseId: course.id },
      });
      expect(channelA).not.toBeNull();
      expect(channelB).not.toBeNull();
      expect(channelA!.id).not.toBe(channelB!.id);
    });

    it("should unarchive the existing course channel when the same course is reassigned", async () => {
      const admin = await createUser({
        email: `admin-reassign-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `REASN-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-reassign-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `REASN-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", cookies);

      const archivedChannel = await prisma.channel.findFirst({
        where: {
          serverId: klass.serverId,
          courseId: course.id,
        },
      });
      expect(archivedChannel).not.toBeNull();
      expect(archivedChannel!.isArchived).toBe(true);

      const reassignRes = await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      expect(reassignRes.status).toBe(201);
      expect(reassignRes.body.success).toBe(true);

      const channels = await prisma.channel.findMany({
        where: {
          serverId: klass.serverId,
          courseId: course.id,
        },
      });
      expect(channels.length).toBe(1);
      expect(channels[0]!.isArchived).toBe(false);
      expect(channels[0]!.archivedAt).toBeNull();
      expect(channels[0]!.archivedBy).toBeNull();
    });
  });

  // ─── GET /api/classes/:id/courses ────────────────────────────────────

  describe("GET /api/classes/:id/courses", () => {
    it("should list assigned courses with teacher info", async () => {
      const admin = await createUser({
        email: `admin-listcrs-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `LIST-CRS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-listcrs-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `LCRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Assign the course first
      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      const res = await request(app)
        .get(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const assignment = res.body.data.find(
        (a: { courseId: number }) => a.courseId === course.id
      );
      expect(assignment).toBeDefined();
      expect(assignment.course.code).toBe(course.code);
      expect(assignment.teacher.user.fullName).toBeDefined();
    });

    it("should return 404 for non-existent class", async () => {
      const user = await createUser({
        email: `user-listcrs-404-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${UNKNOWN_PUBLIC_ID}/courses`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return empty list for class with no courses assigned", async () => {
      const user = await createUser({
        email: `admin-emptycrs-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `EMPTY-CRS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  // ─── DELETE /api/classes/:id/courses/:courseId ────────────────────────

  describe("DELETE /api/classes/:id/courses/:courseId", () => {
    it("should allow admin to remove course and archive the channel", async () => {
      const admin = await createUser({
        email: `admin-rmcrs-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `RM-CRS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-rmcrs-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `RM-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Assign the course first
      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Remove the course
      const res = await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Course removed from class successfully");

      // Verify teaches record deleted
      const teaches = await prisma.teaches.findMany({
        where: { classId: klass.id, courseId: course.id },
      });
      expect(teaches.length).toBe(0);

      // Verify channel is archived, not deleted
      const channel = await prisma.channel.findFirst({
        where: {
          serverId: klass.serverId,
          courseId: course.id,
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.isArchived).toBe(true);
      expect(channel!.archivedAt).not.toBeNull();
      expect(channel!.archivedBy).toBe(admin.id);
    });

    it("should allow HOD to remove course in own department", async () => {
      const dept = await createDepartment({ code: `HOD-RM-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-rmcrs-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      await prisma.department.update({
        where: { id: dept.id },
        data: { hodId: hod.id },
      });

      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-hodrm-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `HODRM-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);

      // Assign course as admin first
      const admin = await createUser({
        email: `admin-hodrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Remove as HOD
      const hodCookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", hodCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow PD to remove course for own program", async () => {
      const dept = await createDepartment({ code: `PD-RM-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-rmcrs-${Date.now()}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id, { semesters: 8 });

      await prisma.program.update({
        where: { id: program.id },
        data: { programDirectorId: pd.id },
      });

      const klass = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-pdrm-${Date.now()}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `PDRM-CRS-${uid()}` });
      await addCurrentCurriculum(program.id, klass, course.id);

      // Assign course as admin first
      const admin = await createUser({
        email: `admin-pdrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Remove as PD
      const pdCookies = await loginAs(pd.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", pdCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 403 for HOD in other department", async () => {
      const ownDept = await createDepartment({ code: `HOD-RMOWN-${uid()}` });
      const otherDept = await createDepartment({ code: `HOD-RMOTH-${uid()}` });
      const hod = await createTeacherWithInfo(ownDept.id, {
        email: `hod-othrmcrs-${Date.now()}@test.com`,
        password: "Pass@1234",
      });

      await prisma.department.update({
        where: { id: ownDept.id },
        data: { hodId: hod.id },
      });

      const otherProgram = await createProgram(otherDept.id, { semesters: 8 });
      const klass = await createClass(otherProgram.id);
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-othrm-${Date.now()}@test.com`,
      });
      const course = await createCourse(otherDept.id, { code: `OTHRM-CRS-${uid()}` });
      await addCurrentCurriculum(otherProgram.id, klass, course.id);

      // Assign course as admin
      const admin = await createUser({
        email: `admin-othrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Try to remove as HOD of other dept
      const hodCookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", hodCookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent assignment", async () => {
      const admin = await createUser({
        email: `admin-rm404-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `RM404-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const course = await createCourse(dept.id, { code: `RM404-CRS-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/classes/${klass.publicId}/courses/${course.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/classes/:id/semester-progression ──────────────────────

  describe("Module 2 - Academic class hardening", () => {
    it("should transfer a same-department student and move auto class memberships", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `TRN-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-transfer-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const program = await createProgram(dept.id, { semesters: 8 });
      const sourceClass = await createClass(program.id, { section: "A" });
      const targetClass = await createClass(program.id, { section: "B" });
      const student = await createStudentWithInfo(sourceClass.id, dept.id, {
        email: `student-transfer-${u}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${targetClass.publicId}/students`)
        .set("Cookie", cookies)
        .send({ studentPublicId: student.publicId });

      expect(res.status).toBe(200);
      expect(res.body.data.class.publicId).toBe(targetClass.publicId);
      expect(res.body.data.class).not.toHaveProperty("id");

      const studentInfo = await prisma.studentInfo.findUnique({
        where: { studentId: student.id },
        select: { classId: true },
      });
      expect(studentInfo?.classId).toBe(targetClass.id);

      const oldMembership = await prisma.serverMembership.findUnique({
        where: { userId_serverId: { userId: student.id, serverId: sourceClass.serverId } },
      });
      const newMembership = await prisma.serverMembership.findUnique({
        where: { userId_serverId: { userId: student.id, serverId: targetClass.serverId } },
      });
      expect(oldMembership).toBeNull();
      expect(newMembership?.isAutoJoined).toBe(true);
    });

    it("should reject cross-department student transfers", async () => {
      const u = uid();
      const deptA = await createDepartment({ code: `TRXA-${u}` });
      const deptB = await createDepartment({ code: `TRXB-${u}` });
      const hod = await createTeacherWithInfo(deptA.id, {
        email: `hod-cross-transfer-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(deptA.id, hod.id);
      const programA = await createProgram(deptA.id, { semesters: 8 });
      const programB = await createProgram(deptB.id, { semesters: 8 });
      const targetClass = await createClass(programA.id);
      const sourceClass = await createClass(programB.id);
      const student = await createStudentWithInfo(sourceClass.id, deptB.id, {
        email: `student-cross-transfer-${u}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${targetClass.publicId}/students`)
        .set("Cookie", cookies)
        .send({ studentPublicId: student.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should replace a class-course teacher and sync class server memberships", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-replace-teacher-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `RPT-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const course = await createCourse(dept.id, { code: `RPT-C-${u}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const firstTeacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-old-${u}@test.com`,
      });
      const secondTeacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-new-${u}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: firstTeacher.publicId });

      const res = await request(app)
        .patch(`/api/classes/${klass.publicId}/courses/${course.id}/teacher`)
        .set("Cookie", cookies)
        .send({ teacherPublicId: secondTeacher.publicId });

      expect(res.status).toBe(200);
      expect(res.body.data.teacherPublicId).toBe(secondTeacher.publicId);

      const assignment = await prisma.teaches.findUnique({
        where: { classId_courseId: { classId: klass.id, courseId: course.id } },
      });
      expect(assignment?.teacherId).toBe(secondTeacher.id);

      const oldMembership = await prisma.serverMembership.findUnique({
        where: { userId_serverId: { userId: firstTeacher.id, serverId: klass.serverId } },
      });
      const newMembership = await prisma.serverMembership.findUnique({
        where: { userId_serverId: { userId: secondTeacher.id, serverId: klass.serverId } },
      });
      expect(oldMembership).toBeNull();
      expect(newMembership?.isAutoJoined).toBe(true);

      const channel = await prisma.channel.findFirst({
        where: { serverId: klass.serverId, courseId: course.id },
      });
      expect(channel?.isArchived).toBe(false);
      expect(channel?.isLocked).toBe(false);
    });

    it("should allow a PD to replace teachers only for an own-program class", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PDR-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-replace-${u}@test.com`,
        password: "Pass@1234",
      });
      const ownProgram = await createProgram(dept.id, { semesters: 8 });
      const otherProgram = await createProgram(dept.id, { semesters: 8 });
      await prisma.program.update({
        where: { id: ownProgram.id },
        data: { programDirectorId: pd.id },
      });
      const ownClass = await createClass(ownProgram.id);
      const otherClass = await createClass(otherProgram.id);
      const ownCourse = await createCourse(dept.id, { code: `PDR-O-${u}` });
      const otherCourse = await createCourse(dept.id, { code: `PDR-X-${u}` });
      await addCurrentCurriculum(ownProgram.id, ownClass, ownCourse.id);
      await addCurrentCurriculum(otherProgram.id, otherClass, otherCourse.id);
      const firstTeacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-pdr-first-${u}@test.com`,
      });
      const secondTeacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-pdr-second-${u}@test.com`,
      });
      const admin = await createUser({
        email: `admin-pdr-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      const pdCookies = await loginAs(pd.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${ownClass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: ownCourse.id, teacherPublicId: firstTeacher.publicId });
      await request(app)
        .post(`/api/classes/${otherClass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: otherCourse.id, teacherPublicId: firstTeacher.publicId });

      const ownReplace = await request(app)
        .patch(`/api/classes/${ownClass.publicId}/courses/${ownCourse.id}/teacher`)
        .set("Cookie", pdCookies)
        .send({ teacherPublicId: secondTeacher.publicId });
      const otherReplace = await request(app)
        .patch(`/api/classes/${otherClass.publicId}/courses/${otherCourse.id}/teacher`)
        .set("Cookie", pdCookies)
        .send({ teacherPublicId: secondTeacher.publicId });

      expect(ownReplace.status).toBe(200);
      expect(otherReplace.status).toBe(403);
    });

    it("should reject PD semester progression attempts", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PDP-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-progress-${u}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id, { semesters: 8 });
      await prisma.program.update({ where: { id: program.id }, data: { programDirectorId: pd.id } });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject CR academic mutation attempts", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRM-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const sourceClass = await createClass(program.id, { section: "A" });
      const targetClass = await createClass(program.id, { section: "B" });
      const cr = await createStudentWithInfo(sourceClass.id, dept.id, {
        email: `cr-mutate-${u}@test.com`,
        password: "Pass@1234",
      });
      const student = await createStudentWithInfo(sourceClass.id, dept.id, {
        email: `student-cr-mutate-${u}@test.com`,
      });
      await prisma.class.update({ where: { id: sourceClass.id }, data: { crId: cr.id } });
      const cookies = await loginAs(cr.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${targetClass.publicId}/students`)
        .set("Cookie", cookies)
        .send({ studentPublicId: student.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject PD graduation attempts", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PDG-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-graduate-${u}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id, { semesters: 1 });
      await prisma.program.update({ where: { id: program.id }, data: { programDirectorId: pd.id } });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/graduation`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should graduate final-semester classes, archive course channels, and block progression", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-graduate-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `GRD-${u}` });
      const program = await createProgram(dept.id, { semesters: 1 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      await prisma.channel.create({
        data: {
          serverId: klass.serverId,
          name: `general-${u}`,
          type: "GENERAL",
          isAutoCreated: true,
          createdBy: admin.id,
        },
      });
      const course = await createCourse(dept.id, { code: `GRD-C-${u}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-graduate-${u}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/graduation`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("GRADUATED");
      expect(res.body.data.permissions.canGraduate).toBe(false);
      expect(res.body.data.permissions.canAdvanceSemester).toBe(false);

      const courseChannel = await prisma.channel.findFirst({
        where: { serverId: klass.serverId, courseId: course.id },
      });
      expect(courseChannel?.isArchived).toBe(true);
      expect(courseChannel?.isLocked).toBe(true);

      const generalChannel = await prisma.channel.findFirst({
        where: { serverId: klass.serverId, type: "GENERAL" },
      });
      expect(generalChannel?.isArchived).toBe(false);
      expect(generalChannel?.isLocked).toBe(false);

      const progression = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(progression.status).toBe(409);
      expect(progression.body.success).toBe(false);
    });
  });

  describe("POST /api/classes/:id/semester-progression", () => {
    it("should advance semester successfully as admin → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SP-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currentSemester).toBe(2);
    });

    it("should archive and lock existing course channels", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-arch-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPA-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPA-C-${u}` });
      await addCurrentCurriculum(program.id, klass, course.id);

      // Assign course to class via API to get auto-created channel
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-spa-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Verify channel exists
      const channelBefore = await prisma.channel.findFirst({
        where: { serverId: klass.serverId, courseId: course.id },
      });
      expect(channelBefore).not.toBeNull();
      expect(channelBefore!.isArchived).toBe(false);
      expect(channelBefore!.isLocked).toBe(false);

      // Advance semester
      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(200);

      // Verify channel is archived AND locked
      const channelAfter = await prisma.channel.findUnique({
        where: { id: channelBefore!.id },
      });
      expect(channelAfter!.isArchived).toBe(true);
      expect(channelAfter!.archivedAt).not.toBeNull();
      expect(channelAfter!.isLocked).toBe(true);
      expect(channelAfter!.lockedAt).not.toBeNull();
    });

    it("should clear all TEACHES records", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-clr-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPCLR-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPCLR-C-${u}` });
      await addCurrentCurriculum(program.id, klass, course.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-spclr-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });

      // Verify teaches record exists
      const teachesBefore = await prisma.teaches.findMany({
        where: { classId: klass.id },
      });
      expect(teachesBefore.length).toBe(1);

      // Advance semester
      await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      // Verify teaches records cleared
      const teachesAfter = await prisma.teaches.findMany({
        where: { classId: klass.id },
      });
      expect(teachesAfter.length).toBe(0);
    });

    it("should auto-create course channels from curriculum with teacher assignments", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-cur-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPCUR-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });

      // Create courses and curriculum for semester 2
      const course1 = await createCourse(dept.id, { code: `SPC1-${u}` });
      const course2 = await createCourse(dept.id, { code: `SPC2-${u}` });
      await createCurriculum(program.id, course1.id, 2, klass.admissionYear);
      await createCurriculum(program.id, course2.id, 2, klass.admissionYear);

      const teacher1 = await createTeacherWithInfo(dept.id, {
        email: `t1-spcur-${u}@test.com`,
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t2-spcur-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [
            { courseId: course1.id, teacherPublicId: teacher1.publicId },
            { courseId: course2.id, teacherPublicId: teacher2.publicId },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.currentSemester).toBe(2);

      // Verify course channels created
      const channels = await prisma.channel.findMany({
        where: {
          serverId: klass.serverId,
          type: "COURSE",
          isArchived: false,
        },
      });
      expect(channels.length).toBe(2);
      const channelCourseIds = channels.map((c) => c.courseId);
      expect(channelCourseIds).toContain(course1.id);
      expect(channelCourseIds).toContain(course2.id);

      // Verify teaches records created
      const teaches = await prisma.teaches.findMany({
        where: { classId: klass.id },
      });
      expect(teaches.length).toBe(2);
    });

    it("should return 400 when curriculum exists but teacher assignments are missing", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-miss-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPMIS-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPMIS-C-${u}` });
      await createCurriculum(program.id, course.id, 2, klass.admissionYear);
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when teacher assignments contain duplicate course entries", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-dup-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPDUP-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPDUP-C-${u}` });
      await createCurriculum(program.id, course.id, 2, klass.admissionYear);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-spdup-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [
            { courseId: course.id, teacherPublicId: teacher.publicId },
            { courseId: course.id, teacherPublicId: teacher.publicId },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when teacher assignments include non-curriculum courses", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-extra-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPEXT-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const courseInCurriculum = await createCourse(dept.id, { code: `SPEXT-C1-${u}` });
      const extraCourse = await createCourse(dept.id, { code: `SPEXT-C2-${u}` });
      await createCurriculum(program.id, courseInCurriculum.id, 2, klass.admissionYear);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-spext-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [
            { courseId: courseInCurriculum.id, teacherPublicId: teacher.publicId },
            { courseId: extraCourse.id, teacherPublicId: teacher.publicId },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should succeed without curriculum (no auto-creation)", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-nocur-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPNC-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.currentSemester).toBe(2);

      // Verify no course channels created
      const courseChannels = await prisma.channel.findMany({
        where: { serverId: klass.serverId, type: "COURSE" },
      });
      expect(courseChannels.length).toBe(0);
    });

    it("should return 400 when already at max semester", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-max-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPMAX-${u}` });
      const program = await createProgram(dept.id, { semesters: 2 });
      const klass = await createClass(program.id, { currentSemester: 2 });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should allow HOD of own department → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SPHOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-sp-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(200);
      expect(res.body.data.currentSemester).toBe(2);
    });

    it("should deny HOD of other department → 403", async () => {
      const u = uid();
      const dept1 = await createDepartment({ code: `SPH1-${u}` });
      const dept2 = await createDepartment({ code: `SPH2-${u}` });
      const hod = await createTeacherWithInfo(dept2.id, {
        email: `hod-sp-oth-${u}@test.com`,
      });
      await assignHOD(dept2.id, hod.id);
      const program = await createProgram(dept1.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should deny non-HOD teacher → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SPNT-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-sp-no-${u}@test.com`,
      });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent class", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-nf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${UNKNOWN_PUBLIC_ID}/semester-progression`)
        .set("Cookie", cookies)
        .send({ teacherAssignments: [] });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should update server name to reflect new semester", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-sn-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPSN-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({ teacherAssignments: [] });

      const server = await prisma.server.findUnique({
        where: { id: klass.serverId },
      });
      expect(server!.name).toContain("S2");
      expect(server!.name).toContain(program.code);
    });

    it("should un-archive existing channel when same course is in new curriculum", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-unarch-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPUA-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPUA-C-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-spua-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      // Simulate an existing course channel from a prior term without relying on current curriculum.
      await prisma.teaches.create({
        data: { classId: klass.id, courseId: course.id, teacherId: teacher.id },
      });
      await prisma.channel.create({
        data: {
          serverId: klass.serverId,
          courseId: course.id,
          name: course.code,
          type: "COURSE",
          isAutoCreated: true,
          createdBy: admin.id,
        },
      });

      const channelBefore = await prisma.channel.findFirst({
        where: { serverId: klass.serverId, courseId: course.id },
      });
      expect(channelBefore!.isArchived).toBe(false);

      // Add same course to curriculum for semester 2
      await createCurriculum(program.id, course.id, 2, klass.admissionYear);

      // Advance semester
      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [{ courseId: course.id, teacherPublicId: teacher.publicId }],
        });

      expect(res.status).toBe(200);

      // Channel should be un-archived and unlocked
      const channelAfter = await prisma.channel.findUnique({
        where: { id: channelBefore!.id },
      });
      expect(channelAfter!.isArchived).toBe(false);
      expect(channelAfter!.archivedAt).toBeNull();
      expect(channelAfter!.isLocked).toBe(false);
      expect(channelAfter!.lockedAt).toBeNull();
    });

    it("should return 400 when teacher assignments provided but no curriculum exists", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-nocu-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPNCU-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPNCU-C-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-spncu-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [{ courseId: course.id, teacherPublicId: teacher.publicId }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should add teachers as server members when assigned via curriculum", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-sp-mem-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `SPMEM-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id, { currentSemester: 1 });
      const course = await createCourse(dept.id, { code: `SPMEM-C-${u}` });
      await createCurriculum(program.id, course.id, 2, klass.admissionYear);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-spmem-${u}@test.com`,
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");

      // Verify teacher is not a member before
      const memberBefore = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: { userId: teacher.id, serverId: klass.serverId },
        },
      });
      expect(memberBefore).toBeNull();

      await request(app)
        .post(`/api/classes/${klass.publicId}/semester-progression`)
        .set("Cookie", adminCookies)
        .send({
          teacherAssignments: [{ courseId: course.id, teacherPublicId: teacher.publicId }],
        });

      // Verify teacher is now a member
      const memberAfter = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: { userId: teacher.id, serverId: klass.serverId },
        },
      });
      expect(memberAfter).not.toBeNull();
      expect(memberAfter!.isAutoJoined).toBe(true);
    });
  });
});
