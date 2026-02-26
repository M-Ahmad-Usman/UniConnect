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
  createCourse,
  loginAs,
} from "../helpers/factory.js";

/** Short unique suffix (max 9 chars) for codes that have length limits */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

beforeAll(async () => {
  await resetDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
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
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.currentSemester).toBe(1);
      expect(res.body.data.academicYear).toBe(2026);
      expect(res.body.data.admissionYear).toBe(2026);
      expect(res.body.data.section).toBe("A");
      expect(res.body.data.serverId).toBeDefined();
      expect(res.body.data.program.id).toBe(program.id);

      // Verify server auto-created
      const server = await prisma.server.findUnique({
        where: { id: res.body.data.serverId },
      });
      expect(server).not.toBeNull();
      expect(server!.type).toBe("CLASS");
      expect(server!.name).toContain(program.code);

      // Verify #announcements and #general channels auto-created
      const channels = await prisma.channel.findMany({
        where: { serverId: res.body.data.serverId },
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
        email: `user-cls-list-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
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
        email: `user-cls-detail-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const dept = await createDepartment({ code: `DTL-CLS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${klass.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(klass.id);
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
        .get("/api/classes/99999")
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
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.courseId).toBe(course.id);
      expect(res.body.data.teacherId).toBe(teacher.id);
      expect(res.body.data.classId).toBe(klass.id);
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
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacherA.id });

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacherB.id });

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
        .post("/api/classes/99999/courses")
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: 99999, teacherId: teacher.id });

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
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: 99999 });

      expect(res.status).toBe(404);
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
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res1 = await request(app)
        .post(`/api/classes/${classA.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/classes/${classB.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      await request(app)
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
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
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

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
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Assign the course first
      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      const res = await request(app)
        .get(`/api/classes/${klass.id}/courses`)
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
        .get("/api/classes/99999/courses")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return empty list for class with no courses assigned", async () => {
      const user = await createUser({
        email: `user-emptycrs-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const dept = await createDepartment({ code: `EMPTY-CRS-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const klass = await createClass(program.id);
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/classes/${klass.id}/courses`)
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
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Assign the course first
      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      // Remove the course
      const res = await request(app)
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
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

      // Assign course as admin first
      const admin = await createUser({
        email: `admin-hodrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      // Remove as HOD
      const hodCookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
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

      // Assign course as admin first
      const admin = await createUser({
        email: `admin-pdrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      // Remove as PD
      const pdCookies = await loginAs(pd.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
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

      // Assign course as admin
      const admin = await createUser({
        email: `admin-othrm-${Date.now()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const adminCookies = await loginAs(admin.email, "Pass@1234");
      await request(app)
        .post(`/api/classes/${klass.id}/courses`)
        .set("Cookie", adminCookies)
        .send({ courseId: course.id, teacherId: teacher.id });

      // Try to remove as HOD of other dept
      const hodCookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
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
        .delete(`/api/classes/${klass.id}/courses/${course.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
