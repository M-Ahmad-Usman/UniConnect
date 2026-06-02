import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createUser,
  createDepartment,
  createCourse,
  createProgram,
  createClass,
  createCurriculum,
  createTeacherWithInfo,
  assignHOD,
  loginAs,
} from "../helpers/factory.js";

/** Short unique suffix for codes */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

beforeAll(async () => {
  await resetDB();
});

describe("Module 7 - Course Search Filters", () => {
  it("should search courses by code or title", async () => {
    const admin = await createUser({
      email: `admin-crs-search-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const dept = await createDepartment({ code: `SRCH-${uid()}` });
    const matching = await createCourse(dept.id, {
      title: "Advanced Weaving Systems",
      code: `AWS-${uid()}`,
    });
    await createCourse(dept.id, {
      title: "Unrelated Course",
      code: `UNR-${uid()}`,
    });
    const cookies = await loginAs(admin.email, "Pass@1234");

    const res = await request(app)
      .get("/api/courses")
      .query({ departmentId: dept.id, search: "weaving" })
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: matching.id })])
    );
    expect(res.body.data.every((course: { title: string; code: string }) =>
      `${course.title} ${course.code}`.toLowerCase().includes("weaving")
    )).toBe(true);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 5 - Course Management", () => {
  // ─── POST /api/courses ───────────────────────────────────────────────

  describe("POST /api/courses", () => {
    it("should allow admin to create a course → 201", async () => {
      const admin = await createUser({
        email: "admin-crs-create@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-CRS-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "Data Structures",
          code: `DS-${uid()}`,
          creditHours: 3,
          departmentId: dept.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe("Data Structures");
      expect(res.body.data.creditHours).toBe(3);
      expect(res.body.data.departmentId).toBe(dept.id);
      expect(res.body.message).toBe("Course created successfully");
    });

    it("should return 409 for duplicate course code", async () => {
      const admin = await createUser({
        email: "admin-crs-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-DUP-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const code = `DUP-${uid()}`;
      await createCourse(dept.id, { code });

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "Duplicate Course",
          code,
          creditHours: 3,
          departmentId: dept.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for non-admin user", async () => {
      const dept = await createDepartment({ code: `CS-NONADM-${uid()}` });
      const student = await createUser({
        email: "student-crs-create@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "Forbidden Course",
          code: `FC-${uid()}`,
          creditHours: 3,
          departmentId: dept.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow an HOD to create a course only for their own department", async () => {
      const ownDepartment = await createDepartment({ code: `HOD-C-${uid()}` });
      const foreignDepartment = await createDepartment({ code: `HOD-F-${uid()}` });
      const hod = await createTeacherWithInfo(ownDepartment.id, {
        email: `hod-course-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(ownDepartment.id, hod.id);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const allowed = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "Department Course",
          code: `HOD-OWN-${uid()}`,
          creditHours: 3,
          departmentId: ownDepartment.id,
        });
      expect(allowed.status).toBe(201);
      expect(allowed.body.data.departmentId).toBe(ownDepartment.id);

      const denied = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "Foreign Department Course",
          code: `HOD-FRN-${uid()}`,
          creditHours: 3,
          departmentId: foreignDepartment.id,
        });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe("SCOPE_FORBIDDEN");
    });

    it("should return 404 for non-existent departmentId", async () => {
      const admin = await createUser({
        email: "admin-crs-nodept@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({
          title: "No Dept Course",
          code: `ND-${uid()}`,
          creditHours: 3,
          departmentId: 999999,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const admin = await createUser({
        email: "admin-crs-missing@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/courses")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/courses ────────────────────────────────────────────────

  describe("GET /api/courses", () => {
    it("should return paginated list of courses", async () => {
      const admin = await createUser({
        email: "admin-crs-list@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-LIST-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await createCourse(dept.id, { title: "Course A", code: `LA-${uid()}` });
      await createCourse(dept.id, { title: "Course B", code: `LB-${uid()}` });

      const res = await request(app)
        .get("/api/courses")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it("should filter courses by departmentId", async () => {
      const admin = await createUser({
        email: "admin-crs-filter@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `D1-${uid()}` });
      const dept2 = await createDepartment({ code: `D2-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      await createCourse(dept1.id, { code: `F1-${uid()}` });
      await createCourse(dept1.id, { code: `F2-${uid()}` });
      await createCourse(dept2.id, { code: `F3-${uid()}` });

      const res = await request(app)
        .get("/api/courses")
        .query({ departmentId: dept1.id })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((c: { departmentId: number }) => c.departmentId === dept1.id)).toBe(true);
    });

    it("should respect custom page and limit params", async () => {
      const admin = await createUser({
        email: "admin-crs-page@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-PG-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      for (let i = 0; i < 3; i++) {
        await createCourse(dept.id, { code: `PG-${uid()}` });
      }

      const res = await request(app)
        .get("/api/courses")
        .query({ departmentId: dept.id, page: 1, limit: 2 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── GET /api/courses/:id ────────────────────────────────────────────

  describe("GET /api/courses/:id", () => {
    it("should return course details with department info", async () => {
      const admin = await createUser({
        email: "admin-crs-get@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({
        name: `CS Dept ${uid()}`,
        code: `CS-GET-${uid()}`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const course = await createCourse(dept.id, {
        title: "Algorithms",
        code: `ALG-${uid()}`,
      });

      const res = await request(app)
        .get(`/api/courses/${course.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(course.id);
      expect(res.body.data.title).toBe("Algorithms");
      expect(res.body.data.department).toBeDefined();
      expect(res.body.data.department.id).toBe(dept.id);
      expect(res.body.data.department.name).toBeDefined();
    });

    it("should return 404 for non-existent course", async () => {
      const admin = await createUser({
        email: "admin-crs-get404@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/courses/999999")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /api/courses/:id ──────────────────────────────────────────

  describe("PATCH /api/courses/:id", () => {
    it("should allow admin to update course title → 200", async () => {
      const admin = await createUser({
        email: "admin-crs-upd@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UPD-${uid()}` });
      const course = await createCourse(dept.id, {
        title: "Old Title",
        code: `UPD-${uid()}`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/courses/${course.id}`)
        .set("Cookie", cookies)
        .send({ title: "New Title" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("New Title");
      expect(res.body.message).toBe("Course updated successfully");
    });

    it("should sync auto-created channel names when course code changes", async () => {
      const admin = await createUser({
        email: "admin-crs-sync@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-SYNC-${uid()}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cls1 = await createClass(program.id, { creatorId: admin.id, section: "A" });
      const cls2 = await createClass(program.id, { creatorId: admin.id, section: "B" });
      const oldCode = `OLD-${uid()}`;
      const course = await createCourse(dept.id, { code: oldCode });
      await createCurriculum(program.id, course.id, cls1.currentSemester, cls1.admissionYear);
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Create a teacher and assign the course to the class to trigger auto-created channel
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-sync-${uid()}@test.com`,
      });

      const assignFirst = await request(app)
        .post(`/api/classes/${cls1.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });
      expect(assignFirst.status).toBe(201);

      const assignSecond = await request(app)
        .post(`/api/classes/${cls2.publicId}/courses`)
        .set("Cookie", cookies)
        .send({ courseId: course.id, teacherPublicId: teacher.publicId });
      expect(assignSecond.status).toBe(201);

      // Verify the auto-created channels exist with the old code
      const channelsBefore = await prisma.channel.findMany({
        where: { courseId: course.id, isAutoCreated: true },
      });
      expect(channelsBefore.length).toBe(2);
      expect(channelsBefore.every((channel) => channel.name === oldCode)).toBe(true);

      // Update the course code
      const newCode = `NEW-${uid()}`;
      const res = await request(app)
        .patch(`/api/courses/${course.id}`)
        .set("Cookie", cookies)
        .send({ code: newCode });

      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(newCode);

      // Verify all auto-created course channel names were synced
      const channelsAfter = await prisma.channel.findMany({
        where: { courseId: course.id, isAutoCreated: true },
      });
      expect(channelsAfter.length).toBe(2);
      expect(channelsAfter.every((channel) => channel.name === newCode)).toBe(true);
    });

    it("should return 409 when updating to a duplicate code", async () => {
      const admin = await createUser({
        email: "admin-crs-upddup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UDDUP-${uid()}` });
      const existingCode = `EX-${uid()}`;
      await createCourse(dept.id, { code: existingCode });
      const course = await createCourse(dept.id, { code: `TODUP-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/courses/${course.id}`)
        .set("Cookie", cookies)
        .send({ code: existingCode });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent course", async () => {
      const admin = await createUser({
        email: "admin-crs-upd404@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/courses/999999")
        .set("Cookie", cookies)
        .send({ title: "Ghost" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for non-admin user", async () => {
      const dept = await createDepartment({ code: `CS-UPDNA-${uid()}` });
      const course = await createCourse(dept.id, { code: `NA-${uid()}` });
      const student = await createUser({
        email: "student-crs-upd@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/courses/${course.id}`)
        .set("Cookie", cookies)
        .send({ title: "Nope" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when no fields are provided", async () => {
      const admin = await createUser({
        email: "admin-crs-updnone@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CS-UPDNO-${uid()}` });
      const course = await createCourse(dept.id, { code: `NO-${uid()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/courses/${course.id}`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
