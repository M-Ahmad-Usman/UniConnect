import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createUser,
  createClass,
  createDepartment,
  createProgram,
  createCourse,
  createCurriculum,
  createTeacherWithInfo,
  assignHOD,
  assignPD,
  loginAs,
} from "../helpers/factory.js";

/** Short unique suffix */
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

describe("Curriculum management", () => {
  // ─── GET /api/programs/:id/curriculum ────────────────────────────────

  describe("GET /api/programs/:id/curriculum", () => {
    it("should return curriculum entries for a program → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-get-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CG-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course1 = await createCourse(dept.id, { code: `CG1-${u}` });
      const course2 = await createCourse(dept.id, { code: `CG2-${u}` });
      await createCurriculum(program.id, course1.id, 1, 2026);
      await createCurriculum(program.id, course2.id, 2, 2026);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].course).toBeDefined();
      expect(res.body.data[0].semesterNumber).toBeDefined();
    });

    it("should filter by semesterNumber → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-fs-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CFS-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course1 = await createCourse(dept.id, { code: `CFS1-${u}` });
      const course2 = await createCourse(dept.id, { code: `CFS2-${u}` });
      await createCurriculum(program.id, course1.id, 1, 2026);
      await createCurriculum(program.id, course2.id, 2, 2026);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/programs/${program.id}/curriculum?semesterNumber=1`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].semesterNumber).toBe(1);
    });

    it("should filter by batchYear → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-fb-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CFB-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course1 = await createCourse(dept.id, { code: `CFB1-${u}` });
      const course2 = await createCourse(dept.id, { code: `CFB2-${u}` });
      await createCurriculum(program.id, course1.id, 1, 2026);
      await createCurriculum(program.id, course2.id, 1, 2025);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/programs/${program.id}/curriculum?batchYear=2026`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].batchYear).toBe(2026);
    });

    it("should mark entries locked through the highest reached class semester", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-lock-state-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CGLK-${u}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      const course1 = await createCourse(dept.id, { code: `CGLK1-${u}` });
      const course2 = await createCourse(dept.id, { code: `CGLK2-${u}` });
      const course3 = await createCourse(dept.id, { code: `CGLK3-${u}` });
      await createCurriculum(program.id, course1.id, 1, 2026);
      await createCurriculum(program.id, course2.id, 2, 2026);
      await createCurriculum(program.id, course3.id, 3, 2026);
      await createClass(program.id, { currentSemester: 2 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/programs/${program.id}/curriculum?batchYear=2026`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            semesterNumber: 1,
            isLocked: true,
            lockedThroughSemester: 2,
          }),
          expect.objectContaining({
            semesterNumber: 2,
            isLocked: true,
            lockedThroughSemester: 2,
          }),
          expect.objectContaining({
            semesterNumber: 3,
            isLocked: false,
            lockedThroughSemester: 2,
          }),
        ]),
      );
    });

    it("should return 404 for non-existent program", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-nf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/programs/999999/curriculum")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when course belongs to a different department", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-dept-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `CADEP1-${u}` });
      const dept2 = await createDepartment({ code: `CADEP2-${u}` });
      const program = await createProgram(dept1.id, { semesters: 8 });
      const foreignCourse = await createCourse(dept2.id, { code: `CADEP-C-${u}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: foreignCourse.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /api/programs/:id/curriculum ───────────────────────────────

  describe("POST /api/programs/:id/curriculum", () => {
    it("should allow admin to add curriculum entry → 201", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-add-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CA-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CA-C-${u}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.semesterNumber).toBe(1);
      expect(res.body.data.batchYear).toBe(2026);
      expect(res.body.data.course.id).toBe(course.id);
    });

    it("should allow HOD of own department → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CAHOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-ca-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CAHOD-C-${u}` });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should allow Program Director of own program → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CAPD-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-ca-${u}@test.com`,
      });
      const program = await createProgram(dept.id, { semesters: 8 });
      await assignPD(program.id, pd.id);
      const course = await createCourse(dept.id, { code: `CAPD-C-${u}` });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should deny Program Director of other program → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CAPDO-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-ca-oth-${u}@test.com`,
      });
      const directedProgram = await createProgram(dept.id, { semesters: 8, code: `CAPDO1-${u}` });
      const otherProgram = await createProgram(dept.id, { semesters: 8, code: `CAPDO2-${u}` });
      await assignPD(directedProgram.id, pd.id);
      const course = await createCourse(dept.id, { code: `CAPDO-C-${u}` });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${otherProgram.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should deny teacher without HOD or Program Director scope → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CAT-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-ca-${u}@test.com`,
      });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CAT-C-${u}` });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should deny HOD of other department → 403", async () => {
      const u = uid();
      const dept1 = await createDepartment({ code: `CAH1-${u}` });
      const dept2 = await createDepartment({ code: `CAH2-${u}` });
      const hod = await createTeacherWithInfo(dept2.id, {
        email: `hod-ca-oth-${u}@test.com`,
      });
      await assignHOD(dept2.id, hod.id);
      const program = await createProgram(dept1.id, { semesters: 8 });
      const course = await createCourse(dept1.id, { code: `CAH-C-${u}` });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate curriculum entry", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-dup-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CADUP-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CADUP-C-${u}` });
      await createCurriculum(program.id, course.id, 1, 2026);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when semester exceeds program semesters", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-sem-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CASEM-${u}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      const course = await createCourse(dept.id, { code: `CASEM-C-${u}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 5,
          batchYear: 2026,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent course", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-cnf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CACNF-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum`)
        .set("Cookie", cookies)
        .send({
          courseId: 999999,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent program", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-pnf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CAPNF-${u}` });
      const course = await createCourse(dept.id, { code: `CAPNF-C-${u}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/programs/999999/curriculum")
        .set("Cookie", cookies)
        .send({
          courseId: course.id,
          semesterNumber: 1,
          batchYear: 2026,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/programs/:id/curriculum/bulk", () => {
    it("should add multiple courses and skip existing duplicates", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-bulk-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CBULK-${u}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      const existingCourse = await createCourse(dept.id, { code: `CBULK1-${u}` });
      const newCourse = await createCourse(dept.id, { code: `CBULK2-${u}` });
      await createCurriculum(program.id, existingCourse.id, 1, 2026);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum/bulk`)
        .set("Cookie", cookies)
        .send({
          courseIds: [existingCourse.id, newCourse.id, newCourse.id],
          semesterNumber: 2,
          batchYear: 2026,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.addedCount).toBe(1);
      expect(res.body.data.skippedCourseIds).toEqual([existingCourse.id]);
      expect(res.body.data.entries).toEqual([
        expect.objectContaining({ course: expect.objectContaining({ id: newCourse.id }) }),
      ]);
    });

    it("should block edits to semesters already reached by an existing class", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-bulk-lock-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CBLK-${u}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      await createClass(program.id, { currentSemester: 2 });
      const course = await createCourse(dept.id, { code: `CBLK-C-${u}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum/bulk`)
        .set("Cookie", cookies)
        .send({
          courseIds: [course.id],
          semesterNumber: 2,
          batchYear: 2026,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/programs/:id/curriculum/copy-batch", () => {
    it("should copy a full source batch curriculum and skip target duplicates", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-copy-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CCOPY-${u}` });
      const program = await createProgram(dept.id, { semesters: 2 });
      const course1 = await createCourse(dept.id, { code: `CCOPY1-${u}` });
      const course2 = await createCourse(dept.id, { code: `CCOPY2-${u}` });
      await createCurriculum(program.id, course1.id, 1, 2025);
      await createCurriculum(program.id, course2.id, 2, 2025);
      await createCurriculum(program.id, course1.id, 1, 2026);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum/copy-batch`)
        .set("Cookie", cookies)
        .send({ sourceBatchYear: 2025, targetBatchYear: 2026 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.addedCount).toBe(1);
      expect(res.body.data.skippedCourseIds).toEqual([course1.id]);
      expect(res.body.data.entries).toEqual([
        expect.objectContaining({
          semesterNumber: 2,
          course: expect.objectContaining({ id: course2.id }),
        }),
      ]);
    });

    it("should reject copying from an incomplete source batch", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-copy-inc-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CCINC-${u}` });
      const program = await createProgram(dept.id, { semesters: 2 });
      const course = await createCourse(dept.id, { code: `CCINC-C-${u}` });
      await createCurriculum(program.id, course.id, 1, 2025);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/programs/${program.id}/curriculum/copy-batch`)
        .set("Cookie", cookies)
        .send({ sourceBatchYear: 2025, targetBatchYear: 2026 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /api/programs/:id/curriculum/:curriculumId ───────────────

  describe("DELETE /api/programs/:id/curriculum/:curriculumId", () => {
    it("should allow admin to remove curriculum entry → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-del-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CD-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CD-C-${u}` });
      const entry = await createCurriculum(program.id, course.id, 1, 2026);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted
      const deleted = await prisma.programCurriculum.findUnique({
        where: { id: entry.id },
      });
      expect(deleted).toBeNull();
    });

    it("should allow HOD of own department → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CDHOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cd-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const program = await createProgram(dept.id, { semesters: 8 });
      const course = await createCourse(dept.id, { code: `CDHOD-C-${u}` });
      const entry = await createCurriculum(program.id, course.id, 1, 2026);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow Program Director of own program → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CDPD-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-cd-${u}@test.com`,
      });
      const program = await createProgram(dept.id, { semesters: 8 });
      await assignPD(program.id, pd.id);
      const course = await createCourse(dept.id, { code: `CDPD-C-${u}` });
      const entry = await createCurriculum(program.id, course.id, 1, 2026);
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should deny Program Director of other program → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CDPDO-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-cd-oth-${u}@test.com`,
      });
      const directedProgram = await createProgram(dept.id, { semesters: 8, code: `CDPDO1-${u}` });
      const otherProgram = await createProgram(dept.id, { semesters: 8, code: `CDPDO2-${u}` });
      await assignPD(directedProgram.id, pd.id);
      const course = await createCourse(dept.id, { code: `CDPDO-C-${u}` });
      const entry = await createCurriculum(otherProgram.id, course.id, 1, 2026);
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${otherProgram.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should deny HOD of other department → 403", async () => {
      const u = uid();
      const dept1 = await createDepartment({ code: `CDH1-${u}` });
      const dept2 = await createDepartment({ code: `CDH2-${u}` });
      const hod = await createTeacherWithInfo(dept2.id, {
        email: `hod-cd-oth-${u}@test.com`,
      });
      await assignHOD(dept2.id, hod.id);
      const program = await createProgram(dept1.id, { semesters: 8 });
      const course = await createCourse(dept1.id, { code: `CDH-C-${u}` });
      const entry = await createCurriculum(program.id, course.id, 1, 2026);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent curriculum entry", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-dnf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CDNF-${u}` });
      const program = await createProgram(dept.id, { semesters: 8 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/999999`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when curriculum entry belongs to different program", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-dp-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CDDP-${u}` });
      const program1 = await createProgram(dept.id, { semesters: 8 });
      const program2 = await createProgram(dept.id, { semesters: 8, code: `CDDP2-${u}` });
      const course = await createCourse(dept.id, { code: `CDDP-C-${u}` });
      const entry = await createCurriculum(program1.id, course.id, 1, 2026);
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Try to delete entry from program2
      const res = await request(app)
        .delete(`/api/programs/${program2.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should block removal from semesters already reached by an existing class", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-cur-del-lock-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `CDLK-${u}` });
      const program = await createProgram(dept.id, { semesters: 4 });
      const course = await createCourse(dept.id, { code: `CDLK-C-${u}` });
      const entry = await createCurriculum(program.id, course.id, 1, 2026);
      await createClass(program.id, { currentSemester: 1 });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .delete(`/api/programs/${program.id}/curriculum/${entry.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });
});
