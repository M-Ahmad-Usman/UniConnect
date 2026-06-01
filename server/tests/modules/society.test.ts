import request from "supertest";
import { jest } from "@jest/globals";

const disconnectUserSockets = jest.fn();
const emitToUser = jest.fn();
const emitToChannel = jest.fn();
const getIO = jest.fn(() => null);
const initializeSocket = jest.fn();
const resetConnectionCounts = jest.fn();
const resetIO = jest.fn();

await jest.unstable_mockModule("../../src/socket/index.js", () => ({
  disconnectUserSockets,
  emitToUser,
  emitToChannel,
  getIO,
  initializeSocket,
  resetConnectionCounts,
  resetIO,
}));

const { app } = await import("../../src/app.js");
const { prisma } = await import("../../src/config/prisma.js");
const { resetDB } = await import("../helpers/db.helper.js");
const {
  createUser,
  createDepartment,
  createProgram,
  createClass,
  createTeacherWithInfo,
  createStudentWithInfo,
  createSociety,
  createSocietyMembershipRequest,
  loginAs,
} = await import("../helpers/factory.js");

/** Short unique suffix */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

const UNKNOWN_PUBLIC_ID = "0198f1f0-0000-7000-8000-000000000000";

beforeAll(async () => {
  await resetDB();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Module 6 - Society Management", () => {
  // ─── POST /api/societies ─────────────────────────────────────────────

  describe("POST /api/societies", () => {
    it("should allow admin to create a society → 201", async () => {
      const admin = await createUser({
        email: `admin-soc-create-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-SOC-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `conv-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `Tech Society ${uid()}`,
          description: "A tech society",
          departmentId: dept.id,
          presidentPublicId: student.publicId,
          convenorPublicId: teacher.publicId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicId).toBeDefined();
      expect(res.body.data.department.id).toBe(dept.id);
      expect(res.body.data.president.user.publicId).toBe(student.publicId);
      expect(res.body.data.convenor.user.publicId).toBe(teacher.publicId);
      expect(res.body.message).toBe("Society created successfully");

      // Verify server and channels were created
      const society = await prisma.society.findUnique({
        where: { publicId: res.body.data.publicId },
        select: { serverId: true },
      });
      const channels = await prisma.channel.findMany({
        where: { serverId: society!.serverId },
        orderBy: { name: "asc" },
      });
      expect(channels.length).toBe(2);
      expect(channels.map((c) => c.name)).toEqual(["announcements", "general"]);

      // Verify memberships were created
      const memberships = await prisma.serverMembership.findMany({
        where: { serverId: society!.serverId },
      });
      expect(memberships.length).toBe(2);
    });

    it("should allow HOD to create a society in own department → 201", async () => {
      const dept = await createDepartment({ code: `CS-HOD-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-soc-${uid()}@test.com`,
        password: "Pass@1234",
      });
      // Set HOD
      await prisma.department.update({
        where: { id: dept.id },
        data: { hodId: hod.id },
      });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: hod.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-hod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-hod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `HOD Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: student.publicId,
          convenorPublicId: convenor.publicId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should return 403 when non-HOD teacher tries to create → 403", async () => {
      const dept = await createDepartment({ code: `CS-NHOD-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `notHod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: teacher.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-nhod-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-nhod-${uid()}@test.com`,
      });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `Unauthorized Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: student.publicId,
          convenorPublicId: convenor.publicId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for student → 403", async () => {
      const dept = await createDepartment({ code: `CS-STD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stud-soc-create-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `Student Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: student.publicId,
          convenorPublicId: UNKNOWN_PUBLIC_ID,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent department", async () => {
      const admin = await createUser({
        email: `admin-soc-nodept-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `No Dept Society ${uid()}`,
          departmentId: 999999,
          presidentPublicId: UNKNOWN_PUBLIC_ID,
          convenorPublicId: UNKNOWN_PUBLIC_ID,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent student (president)", async () => {
      const admin = await createUser({
        email: `admin-soc-nopres-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-NP-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `conv-np-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `No Pres Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: UNKNOWN_PUBLIC_ID,
          convenorPublicId: teacher.publicId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent teacher (convenor)", async () => {
      const admin = await createUser({
        email: `admin-soc-noconv-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-NC-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-nc-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `No Conv Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: student.publicId,
          convenorPublicId: UNKNOWN_PUBLIC_ID,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when president user has no StudentInfo row", async () => {
      const admin = await createUser({
        email: `admin-soc-nostinfo-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-NSI-${uid()}` });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-nostinfo-${uid()}@test.com`,
      });
      const studentNoInfo = await createUser({
        email: `student-noinfo-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `No StudentInfo Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: studentNoInfo.publicId,
          convenorPublicId: convenor.publicId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when convenor user has no TeacherInfo row", async () => {
      const admin = await createUser({
        email: `admin-soc-noteinfo-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-NTI-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-noteinfo-${uid()}@test.com`,
      });
      const teacherNoInfo = await createUser({
        email: `teacher-noinfo-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "TEACHER",
        departmentId: dept.id,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `No TeacherInfo Society ${uid()}`,
          departmentId: dept.id,
          presidentPublicId: president.publicId,
          convenorPublicId: teacherNoInfo.publicId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when president belongs to another department", async () => {
      const admin = await createUser({
        email: `admin-soc-crosspres-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `CS-CP1-${uid()}` });
      const dept2 = await createDepartment({ code: `CS-CP2-${uid()}` });
      const program1 = await createProgram(dept1.id);
      const program2 = await createProgram(dept2.id);
      const cls1 = await createClass(program1.id, { creatorId: admin.id });
      const cls2 = await createClass(program2.id, { creatorId: admin.id });
      const studentFromOtherDept = await createStudentWithInfo(cls2.id, dept2.id, {
        email: `pres-cross-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept1.id, {
        email: `conv-cross-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `Cross President Society ${uid()}`,
          departmentId: dept1.id,
          presidentPublicId: studentFromOtherDept.publicId,
          convenorPublicId: convenor.publicId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when convenor belongs to another department", async () => {
      const admin = await createUser({
        email: `admin-soc-crossconv-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `CS-CC1-${uid()}` });
      const dept2 = await createDepartment({ code: `CS-CC2-${uid()}` });
      const program1 = await createProgram(dept1.id);
      const cls1 = await createClass(program1.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls1.id, dept1.id, {
        email: `pres-crossconv-${uid()}@test.com`,
      });
      const teacherFromOtherDept = await createTeacherWithInfo(dept2.id, {
        email: `conv-crossconv-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: `Cross Convenor Society ${uid()}`,
          departmentId: dept1.id,
          presidentPublicId: student.publicId,
          convenorPublicId: teacherFromOtherDept.publicId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate society name", async () => {
      const admin = await createUser({
        email: `admin-soc-dup-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-DUP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-dup1-${uid()}@test.com`,
      });
      const teacher1 = await createTeacherWithInfo(dept.id, {
        email: `conv-dup1-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-dup2-${uid()}@test.com`,
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `conv-dup2-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const socName = `Unique Society ${uid()}`;

      await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: socName,
          departmentId: dept.id,
          presidentPublicId: student1.publicId,
          convenorPublicId: teacher1.publicId,
        });

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({
          name: socName,
          departmentId: dept.id,
          presidentPublicId: student2.publicId,
          convenorPublicId: teacher2.publicId,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const admin = await createUser({
        email: `admin-soc-miss-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/societies ──────────────────────────────────────────────

  describe("GET /api/societies", () => {
    it("should return paginated list of societies", async () => {
      const admin = await createUser({
        email: `admin-soc-list-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LIST-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-list1-${uid()}@test.com`,
      });
      const teacher1 = await createTeacherWithInfo(dept.id, {
        email: `conv-list1-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-list2-${uid()}@test.com`,
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `conv-list2-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await createSociety(dept.id, student1.id, teacher1.id, {
        name: `List Society A ${uid()}`,
        creatorId: admin.id,
      });
      await createSociety(dept.id, student2.id, teacher2.id, {
        name: `List Society B ${uid()}`,
        creatorId: admin.id,
      });

      const res = await request(app)
        .get("/api/societies")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it("should filter societies by departmentId", async () => {
      const admin = await createUser({
        email: `admin-soc-filt-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `D1-SOC-${uid()}` });
      const dept2 = await createDepartment({ code: `D2-SOC-${uid()}` });
      const prog1 = await createProgram(dept1.id);
      const prog2 = await createProgram(dept2.id);
      const cls1 = await createClass(prog1.id, { creatorId: admin.id });
      const cls2 = await createClass(prog2.id, { creatorId: admin.id });
      const student1 = await createStudentWithInfo(cls1.id, dept1.id, {
        email: `pres-filt1-${uid()}@test.com`,
      });
      const teacher1 = await createTeacherWithInfo(dept1.id, {
        email: `conv-filt1-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls2.id, dept2.id, {
        email: `pres-filt2-${uid()}@test.com`,
      });
      const teacher2 = await createTeacherWithInfo(dept2.id, {
        email: `conv-filt2-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await createSociety(dept1.id, student1.id, teacher1.id, {
        name: `Filter Soc A ${uid()}`,
        creatorId: admin.id,
      });
      await createSociety(dept2.id, student2.id, teacher2.id, {
        name: `Filter Soc B ${uid()}`,
        creatorId: admin.id,
      });

      const res = await request(app)
        .get("/api/societies")
        .query({ departmentId: dept1.id })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: { departmentId: number }) => s.departmentId === dept1.id)).toBe(true);
    });

    it("should respect pagination params", async () => {
      const admin = await createUser({
        email: `admin-soc-pg-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/societies")
        .query({ page: 1, limit: 2 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  // ─── GET /api/societies/:publicId ──────────────────────────────────────────

  describe("GET /api/societies/:publicId", () => {
    it("should return society details with member count", async () => {
      const admin = await createUser({
        email: `admin-soc-get-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-GET-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-get-${uid()}@test.com`,
      });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `conv-get-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const { society } = await createSociety(dept.id, student.id, teacher.id, {
        name: `Detail Society ${uid()}`,
        creatorId: admin.id,
      });

      const res = await request(app)
        .get(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicId).toBe(society.publicId);
      expect(res.body.data.department).toBeDefined();
      expect(res.body.data.president).toBeDefined();
      expect(res.body.data.convenor).toBeDefined();
      expect(res.body.data.server._count.memberships).toBe(2);
    });

    it("should return 404 for non-existent society", async () => {
      const admin = await createUser({
        email: `admin-soc-get404-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${UNKNOWN_PUBLIC_ID}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /api/societies/:publicId ────────────────────────────────────────

  describe("PATCH /api/societies/:publicId", () => {
    it("should allow convenor to update name and description → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-upd-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UPD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-upd-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-upd-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, student.id, convenor.id, {
        name: `Update Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ name: "Updated Name", description: "Updated desc" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Name");
      expect(res.body.data.description).toBe("Updated desc");
      expect(res.body.message).toBe("Society updated successfully");
    });

    it("should allow president to update name → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-updpres-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UPDP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-updself-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-updpres-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Pres Update Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(president.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ name: "President Updated" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("President Updated");
    });

    it("should allow HOD to change leadership → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-updlead-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LEAD-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-updlead-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await prisma.department.update({
        where: { id: dept.id },
        data: { hodId: hod.id },
      });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const oldPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `old-pres-${uid()}@test.com`,
      });
      const newPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `new-pres-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lead-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, oldPresident.id, convenor.id, {
        name: `Leadership Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ presidentPublicId: newPresident.publicId });

      expect(res.status).toBe(200);
      expect(res.body.data.president.user.publicId).toBe(newPresident.publicId);

      // Verify new president was added to server
      const membership = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: {
            userId: newPresident.id,
            serverId: society.serverId,
          },
        },
      });
      expect(membership).not.toBeNull();
    });

    it("should return 403 when non-HOD teacher tries leadership change", async () => {
      const admin = await createUser({
        email: `admin-soc-updfail-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UFLEAD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-uflead-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-uflead-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const newPres = await createStudentWithInfo(cls.id, dept.id, {
        email: `newpres-uf-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Fail Lead Society ${uid()}`,
        creatorId: admin.id,
      });
      // Convenor tries to change president → should fail
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ presidentPublicId: newPres.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for unauthorized user", async () => {
      const admin = await createUser({
        email: `admin-soc-updunauth-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UA-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-ua-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-ua-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Unauth Society ${uid()}`,
        creatorId: admin.id,
      });
      const randomStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `random-stud-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(randomStudent.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ name: "Hacked Name" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when adding a non-student user", async () => {
      const admin = await createUser({
        email: `admin-soc-addmnst-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-ADDMNST-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-addmnst-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-addmnst-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `AddNonStudent Society ${uid()}`,
        creatorId: admin.id,
      });
      const teacherTarget = await createTeacherWithInfo(dept.id, {
        email: `target-teacher-${uid()}@test.com`,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies)
        .send({ userPublicId: teacherTarget.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent society", async () => {
      const admin = await createUser({
        email: `admin-soc-upd404-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${UNKNOWN_PUBLIC_ID}`)
        .set("Cookie", cookies)
        .send({ name: "Ghost Society" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when no fields are provided", async () => {
      const admin = await createUser({
        email: `admin-soc-updnone-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/societies/1")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should sync server name when society name changes", async () => {
      const admin = await createUser({
        email: `admin-soc-sync-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-SYNC-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-sync-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-sync-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, student.id, convenor.id, {
        name: `Sync Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const newName = `Renamed Society ${uid()}`;
      await request(app)
        .patch(`/api/societies/${society.publicId}`)
        .set("Cookie", cookies)
        .send({ name: newName });

      const server = await prisma.server.findUnique({
        where: { id: society.serverId },
      });
      expect(server!.name).toBe(newName);
    });
  });

  // ─── POST /api/societies/:publicId/join-request ────────────────────────────

  describe("POST /api/societies/:publicId/join-request", () => {
    it("should allow student to submit join request → 201", async () => {
      const admin = await createUser({
        email: `admin-soc-jr-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-JR-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-jr-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-jr-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Join Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-jr-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(requester.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/join-request`)
        .set("Cookie", cookies);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("PENDING");
      expect(res.body.data.user.publicId).toBe(requester.publicId);
      expect(res.body.message).toBe("Join request submitted successfully");
    });

    it("should return 409 for duplicate pending request", async () => {
      const admin = await createUser({
        email: `admin-soc-jrdup-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-JRDUP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-jrdup-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-jrdup-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Dup JR Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-jrdup-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(requester.email, "Pass@1234");

      await request(app)
        .post(`/api/societies/${society.publicId}/join-request`)
        .set("Cookie", cookies);

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/join-request`)
        .set("Cookie", cookies);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 if already a member", async () => {
      const admin = await createUser({
        email: `admin-soc-jrmem-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-JRMEM-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-jrmem-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-jrmem-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Mem JR Society ${uid()}`,
        creatorId: admin.id,
      });
      // President is already a member
      const cookies = await loginAs(president.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/join-request`)
        .set("Cookie", cookies);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should allow re-apply after rejection", async () => {
      const admin = await createUser({
        email: `admin-soc-jrreapply-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-JRRE-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-jrre-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-jrre-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Reapply Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-jrre-${uid()}@test.com`,
        password: "Pass@1234",
      });
      // Create a rejected request directly
      await createSocietyMembershipRequest(society.id, requester.id, "REJECTED");

      const cookies = await loginAs(requester.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/join-request`)
        .set("Cookie", cookies);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("PENDING");
    });

    it("should return 403 for non-student", async () => {
      const teacher = await createTeacherWithInfo(
        (await createDepartment({ code: `CS-JRNS-${uid()}` })).id,
        { email: `teacher-jrns-${uid()}@test.com`, password: "Pass@1234" }
      );
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post("/api/societies/1/join-request")
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/societies/:publicId/join-requests ────────────────────────────

  describe("GET /api/societies/:publicId/join-requests", () => {
    it("should allow convenor to list join requests", async () => {
      const admin = await createUser({
        email: `admin-soc-ljr-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LJR-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-ljr-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-ljr-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `List JR Society ${uid()}`,
        creatorId: admin.id,
      });
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-ljr1-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-ljr2-${uid()}@test.com`,
      });
      await createSocietyMembershipRequest(society.id, student1.id, "PENDING");
      await createSocietyMembershipRequest(society.id, student2.id, "PENDING");

      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${society.publicId}/join-requests`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination).toBeDefined();
    });

    it("should filter join requests by status", async () => {
      const admin = await createUser({
        email: `admin-soc-ljrs-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LJRS-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-ljrs-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-ljrs-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Filter JR Society ${uid()}`,
        creatorId: admin.id,
      });
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-ljrs1-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-ljrs2-${uid()}@test.com`,
      });
      await createSocietyMembershipRequest(society.id, student1.id, "PENDING");
      await createSocietyMembershipRequest(society.id, student2.id, "REJECTED");

      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${society.publicId}/join-requests`)
        .query({ status: "PENDING" })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe("PENDING");
    });

    it("should return 403 for unauthorized user", async () => {
      const admin = await createUser({
        email: `admin-soc-ljrua-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LJRUA-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-ljrua-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-ljrua-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Unauth JR Society ${uid()}`,
        creatorId: admin.id,
      });
      const randomStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `rand-ljrua-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(randomStudent.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${society.publicId}/join-requests`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /api/societies/:publicId/join-requests/:requestId ───────────────

  describe("PATCH /api/societies/:publicId/join-requests/:requestId", () => {
    it("should approve a join request and create server membership → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-approve-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-APP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-app-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-app-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Approve Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-app-${uid()}@test.com`,
      });
      const jr = await createSocietyMembershipRequest(society.id, requester.id, "PENDING");
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}/join-requests/${jr.id}`)
        .set("Cookie", cookies)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVED");

      // Verify server membership was created
      const membership = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: {
            userId: requester.id,
            serverId: society.serverId,
          },
        },
      });
      expect(membership).not.toBeNull();
    });

    it("should reject a join request without creating membership → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-reject-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-REJ-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rej-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rej-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Reject Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-rej-${uid()}@test.com`,
      });
      const jr = await createSocietyMembershipRequest(society.id, requester.id, "PENDING");
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}/join-requests/${jr.id}`)
        .set("Cookie", cookies)
        .send({ status: "REJECTED" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("REJECTED");

      // Verify NO server membership
      const membership = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: {
            userId: requester.id,
            serverId: society.serverId,
          },
        },
      });
      expect(membership).toBeNull();
    });

    it("should return 409 for already reviewed request", async () => {
      const admin = await createUser({
        email: `admin-soc-revdup-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-REVDUP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-revdup-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-revdup-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RevDup Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-revdup-${uid()}@test.com`,
      });
      const jr = await createSocietyMembershipRequest(society.id, requester.id, "REJECTED");
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}/join-requests/${jr.id}`)
        .set("Cookie", cookies)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent request", async () => {
      const admin = await createUser({
        email: `admin-soc-rev404-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-REV404-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rev404-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rev404-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Rev404 Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}/join-requests/999999`)
        .set("Cookie", cookies)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for unauthorized user", async () => {
      const admin = await createUser({
        email: `admin-soc-revua-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-REVUA-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-revua-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-revua-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RevUA Society ${uid()}`,
        creatorId: admin.id,
      });
      const requester = await createStudentWithInfo(cls.id, dept.id, {
        email: `req-revua-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const jr = await createSocietyMembershipRequest(society.id, requester.id, "PENDING");
      const cookies = await loginAs(requester.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/societies/${society.publicId}/join-requests/${jr.id}`)
        .set("Cookie", cookies)
        .send({ status: "APPROVED" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/societies/:publicId/members ─────────────────────────────────

  describe("POST /api/societies/:publicId/members", () => {
    it("should allow convenor to add a member → 201", async () => {
      const admin = await createUser({
        email: `admin-soc-addm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-ADDM-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-addm-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-addm-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `AddMem Society ${uid()}`,
        creatorId: admin.id,
      });
      const newMember = await createStudentWithInfo(cls.id, dept.id, {
        email: `newmem-${uid()}@test.com`,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies)
        .send({ userPublicId: newMember.publicId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.publicId).toBe(newMember.publicId);
      expect(res.body.message).toBe("Member added successfully");
    });

    it("should return 409 if user is already a member", async () => {
      const admin = await createUser({
        email: `admin-soc-addmdup-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-ADDMD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-addmdup-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-addmdup-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `DupMem Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      // President is already a member
      const res = await request(app)
        .post(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies)
        .send({ userPublicId: president.publicId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should auto-approve pending request when adding manually", async () => {
      const admin = await createUser({
        email: `admin-soc-addmauto-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-ADDMA-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-addmauto-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-addmauto-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `AutoApprove Society ${uid()}`,
        creatorId: admin.id,
      });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stud-addmauto-${uid()}@test.com`,
      });
      await createSocietyMembershipRequest(society.id, student.id, "PENDING");
      const cookies = await loginAs(convenor.email, "Pass@1234");

      await request(app)
        .post(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies)
        .send({ userPublicId: student.publicId });

      // Verify the pending request was auto-approved
      const jr = await prisma.societyMembershipRequest.findUnique({
        where: { societyId_userId: { societyId: society.id, userId: student.id } },
      });
      expect(jr!.status).toBe("APPROVED");
    });

    it("should return 403 for unauthorized user", async () => {
      const admin = await createUser({
        email: `admin-soc-addmua-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ name: `AddMUA Dept ${uid()}`, code: `CS-ADDMUA-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-addmua-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-addmua-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `AddMUA Society ${uid()}`,
        creatorId: admin.id,
      });
      const randomStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `rand-addmua-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(randomStudent.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies)
        .send({ userPublicId: randomStudent.publicId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/societies/:publicId/members/:userPublicId ───────────────────────

  describe("DELETE /api/societies/:publicId/members/:userPublicId", () => {
    it("should allow convenor to remove a member → 200", async () => {
      const admin = await createUser({
        email: `admin-soc-rmm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-RMM-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rmm-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rmm-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RemMem Society ${uid()}`,
        creatorId: admin.id,
      });
      // Add a member to remove
      const member = await createStudentWithInfo(cls.id, dept.id, {
        email: `mem-rmm-${uid()}@test.com`,
      });
      await prisma.serverMembership.create({
        data: { userId: member.id, serverId: society.serverId, isAutoJoined: false },
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/societies/${society.publicId}/members/${member.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
      expect(res.body.message).toBe("Member removed successfully");

      // Verify membership is deleted
      const membership = await prisma.serverMembership.findUnique({
        where: {
          userId_serverId: { userId: member.id, serverId: society.serverId },
        },
      });
      expect(membership).toBeNull();
    });

    it("disconnects sockets for removed members", async () => {
      const admin = await createUser({
        email: `admin-soc-rmsock-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-RMSOCK-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rmsock-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rmsock-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RmSock Society ${uid()}`,
        creatorId: admin.id,
      });
      const member = await createStudentWithInfo(cls.id, dept.id, {
        email: `mem-rmsock-${uid()}@test.com`,
      });
      await prisma.serverMembership.create({
        data: { userId: member.id, serverId: society.serverId, isAutoJoined: false },
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/societies/${society.publicId}/members/${member.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(disconnectUserSockets).toHaveBeenCalledWith(member.id);
    });

    it("should return 403 when trying to remove president", async () => {
      const admin = await createUser({
        email: `admin-soc-rmpres-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-RMPRES-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rmpres-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rmpres-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RmPres Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/societies/${society.publicId}/members/${president.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when trying to remove convenor", async () => {
      const admin = await createUser({
        email: `admin-soc-rmconv-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-RMCONV-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rmconv-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rmconv-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `RmConv Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(president.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/societies/${society.publicId}/members/${convenor.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when user is not a member", async () => {
      const admin = await createUser({
        email: `admin-soc-rmnotm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-RMNOTM-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-rmnotm-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-rmnotm-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `NotMem Society ${uid()}`,
        creatorId: admin.id,
      });
      const nonMember = await createStudentWithInfo(cls.id, dept.id, {
        email: `nonmem-${uid()}@test.com`,
      });
      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/societies/${society.publicId}/members/${nonMember.publicId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/societies/:publicId/members ──────────────────────────────────

  describe("GET /api/societies/:publicId/members", () => {
    it("should return paginated list of members", async () => {
      const admin = await createUser({
        email: `admin-soc-lm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LM-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-lm-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lm-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `ListMem Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2); // president + convenor
      expect(res.body.pagination).toBeDefined();
    });

    it("should include user info in member list", async () => {
      const admin = await createUser({
        email: `admin-soc-lminfo-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LMINFO-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-lminfo-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lminfo-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `MemInfo Society ${uid()}`,
        creatorId: admin.id,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const member = res.body.data[0];
      expect(member.user).toBeDefined();
      expect(member.user.fullName).toBeDefined();
      expect(member.user.email).toBeDefined();
      expect(member.user.userType).toBeDefined();
    });

    it("should return 404 for non-existent society", async () => {
      const admin = await createUser({
        email: `admin-soc-lm404-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/societies/${UNKNOWN_PUBLIC_ID}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for authenticated user who is not a member", async () => {
      const admin = await createUser({
        email: `admin-soc-lmforbid-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LMFORBID-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-lmforbid-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lmforbid-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Forbid Members Society ${uid()}`,
        creatorId: admin.id,
      });
      const outsider = await createStudentWithInfo(cls.id, dept.id, {
        email: `outsider-lm-${uid()}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(outsider.email, "Pass@1234");
      const res = await request(app)
        .get(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow ordinary members to list members", async () => {
      const admin = await createUser({
        email: `admin-soc-lmmember-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LMMEMBER-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-lmmember-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lmmember-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Member Visible Society ${uid()}`,
        creatorId: admin.id,
      });
      const member = await createStudentWithInfo(cls.id, dept.id, {
        email: `member-lm-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await prisma.serverMembership.create({
        data: { userId: member.id, serverId: society.serverId, isAutoJoined: false },
      });

      const cookies = await loginAs(member.email, "Pass@1234");
      const res = await request(app)
        .get(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.some(
          (item: { user: { publicId: string } }) => item.user.publicId === member.publicId,
        ),
      ).toBe(true);
    });

    it("should keep HOD member-list access private unless they are a member or leader", async () => {
      const admin = await createUser({
        email: `admin-soc-lmhod-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LMHOD-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-lm-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-lmhod-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-lmhod-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `HOD Private Society ${uid()}`,
        creatorId: admin.id,
      });

      const cookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .get(`/api/societies/${society.publicId}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe("You do not have permission to view members of this society");
    });
  });

  describe("GET /api/societies/:publicId/member-candidates", () => {
    it("should return university-wide active students who are not already members", async () => {
      const admin = await createUser({
        email: `admin-soc-cand-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-CAND-${uid()}` });
      const otherDept = await createDepartment({ code: `SE-CAND-${uid()}` });
      const program = await createProgram(dept.id);
      const otherProgram = await createProgram(otherDept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const otherClass = await createClass(otherProgram.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-cand-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-cand-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Candidate Society ${uid()}`,
        creatorId: admin.id,
      });
      const crossDepartmentStudent = await createStudentWithInfo(otherClass.id, otherDept.id, {
        email: `cross-cand-${uid()}@test.com`,
      });
      const existingMember = await createStudentWithInfo(cls.id, dept.id, {
        email: `existing-cand-${uid()}@test.com`,
      });
      await prisma.serverMembership.create({
        data: { userId: existingMember.id, serverId: society.serverId, isAutoJoined: false },
      });

      const cookies = await loginAs(convenor.email, "Pass@1234");
      const res = await request(app)
        .get(`/api/societies/${society.publicId}/member-candidates`)
        .query({ search: "cand", limit: 50 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((candidate: { publicId: string }) => candidate.publicId);
      expect(ids).toContain(crossDepartmentStudent.publicId);
      expect(ids).not.toContain(existingMember.publicId);
    });
  });

  describe("GET /api/societies/leadership-candidates", () => {
    it("should return same-department president and convenor candidates for an authorized HOD", async () => {
      const admin = await createUser({
        email: `admin-soc-leadcand-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LEADCAND-${uid()}` });
      const otherDept = await createDepartment({ code: `SE-LEADCAND-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-leadcand-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } });
      const program = await createProgram(dept.id);
      const otherProgram = await createProgram(otherDept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const otherClass = await createClass(otherProgram.id, { creatorId: admin.id });
      const departmentStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `dept-leadcand-${uid()}@test.com`,
      });
      const crossDepartmentStudent = await createStudentWithInfo(otherClass.id, otherDept.id, {
        email: `cross-leadcand-${uid()}@test.com`,
      });
      const departmentTeacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-leadcand-${uid()}@test.com`,
      });

      const cookies = await loginAs(hod.email, "Pass@1234");
      const presidentRes = await request(app)
        .get("/api/societies/leadership-candidates")
        .query({ departmentId: dept.id, role: "president", limit: 50 })
        .set("Cookie", cookies);
      const convenorRes = await request(app)
        .get("/api/societies/leadership-candidates")
        .query({ departmentId: dept.id, role: "convenor", limit: 50 })
        .set("Cookie", cookies);

      expect(presidentRes.status).toBe(200);
      expect(presidentRes.body.data.map((candidate: { publicId: string }) => candidate.publicId)).toContain(
        departmentStudent.publicId
      );
      expect(presidentRes.body.data.map((candidate: { publicId: string }) => candidate.publicId)).not.toContain(
        crossDepartmentStudent.publicId
      );
      expect(convenorRes.status).toBe(200);
      expect(convenorRes.body.data.map((candidate: { publicId: string }) => candidate.publicId)).toContain(
        departmentTeacher.publicId
      );
    });

    it("should reject HOD candidate lookups outside their department", async () => {
      const dept = await createDepartment({ code: `CS-LEADFORBID-${uid()}` });
      const otherDept = await createDepartment({ code: `SE-LEADFORBID-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-leadforbid-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } });

      const cookies = await loginAs(hod.email, "Pass@1234");
      const res = await request(app)
        .get("/api/societies/leadership-candidates")
        .query({ departmentId: otherDept.id, role: "president" })
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
