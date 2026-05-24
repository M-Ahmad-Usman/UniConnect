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
  createChannel,
  createPost,
  createTeacherWithInfo,
  createStudentWithInfo,
  createSociety,
  loginAs,
} from "../helpers/factory.js";
import { clearStatsCache } from "../../src/modules/admin/admin.service.js";

beforeEach(async () => {
  await resetDB();
  clearStatsCache();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 12 - Admin Dashboard", () => {
  // ─── GET /api/admin/stats ──────────────────────────────────────────────

  describe("GET /api/admin/stats", () => {
    it("should return correct system stats for admin", async () => {
      const admin = await createUser({
        email: "admin-stats@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const dept = await createDepartment({ code: "CS-M12-STATS", creatorId: admin.id });
      const program = await createProgram(dept.id, { code: "BSCS-M12-STATS" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: "teacher-stats@test.com",
        password: "Pass@1234",
      });

      const student = await createStudentWithInfo(klass.id, dept.id, {
        email: "student-stats@test.com",
        password: "Pass@1234",
      });

      // Create a post in a channel
      const channel = await createChannel(klass.serverId, {
        name: "stats-channel",
        createdBy: admin.id,
      });
      await createPost(channel.id, admin.id, { title: "Stats Test Post" });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/stats")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { users, servers, posts } = res.body.data;
      expect(users.total).toBe(3); // admin + teacher + student
      expect(users.students).toBe(1);
      expect(users.teachers).toBe(1);
      expect(users.admins).toBe(1);
      expect(users.active).toBe(3);
      expect(servers.total).toBe(2); // dept server + class server
      expect(servers.department).toBe(1);
      expect(servers.class).toBe(1);
      expect(servers.society).toBe(0);
      expect(posts.total).toBe(1);
    });

    it("should return 403 for non-admin teacher", async () => {
      const dept = await createDepartment({ code: "CS-M12-STATS-T" });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: "teacher-stats-denied@test.com",
        password: "Pass@1234",
      });

      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/stats")
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 403 for student", async () => {
      const student = await createUser({
        email: "student-stats-denied@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/stats")
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/admin/stats");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /api/admin/users ─────────────────────────────────────────────

  describe("GET /api/admin/users", () => {
    it("should return paginated user list for admin", async () => {
      const admin = await createUser({
        email: "admin-list-all@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users?page=1&limit=20")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.total).toBeGreaterThan(0);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it("should filter by userType=STUDENT", async () => {
      const admin = await createUser({
        email: "admin-filter-type@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      await createUser({
        email: "student-filter-type@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users?userType=STUDENT")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.every((u: { userType: string }) => u.userType === "STUDENT")
      ).toBe(true);
    });

    it("should filter by departmentId", async () => {
      const admin = await createUser({
        email: "admin-filter-dept@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const dept = await createDepartment({ code: "CS-M12-FDEPT", creatorId: admin.id });

      await createUser({
        email: "user-in-dept-filter@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/admin/users?departmentId=${dept.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.every(
          (u: { departmentId: number | null }) => u.departmentId === dept.id
        )
      ).toBe(true);
    });

    it("should filter by isActive=false", async () => {
      const admin = await createUser({
        email: "admin-filter-active@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      await createUser({
        email: "inactive-user-filter@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        isActive: false,
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users?isActive=false")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.every((u: { isActive: boolean }) => u.isActive === false)
      ).toBe(true);
    });

    it("should search by partial name", async () => {
      const admin = await createUser({
        email: "admin-search-name@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      await createUser({
        email: "searchable-user@test.com",
        fullName: "Zarqan Hayat",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users?search=Zarqan")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.data.some(
          (u: { fullName: string }) => u.fullName === "Zarqan Hayat"
        )
      ).toBe(true);
    });

    it("should search by partial email", async () => {
      const admin = await createUser({
        email: "admin-search-email@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      await createUser({
        email: "uniqueemail-xyz@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users?search=uniqueemail-xyz")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.data.some(
          (u: { email: string }) => u.email === "uniqueemail-xyz@test.com"
        )
      ).toBe(true);
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-admin-users-denied@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for invalid query params", async () => {
      const admin = await createUser({
        email: "admin-invalid-query@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/admin/users?limit=999&search=${"a".repeat(101)}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── GET /api/departments/:id/stats ───────────────────────────────────

  describe("GET /api/departments/:id/stats", () => {
    it("should return department stats for admin", async () => {
      const admin = await createUser({
        email: "admin-dept-stats@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const dept = await createDepartment({ code: "CS-M12-DSTATS", creatorId: admin.id });
      const program = await createProgram(dept.id, { code: "BSCS-M12-DSTATS" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      await createTeacherWithInfo(dept.id, {
        email: "teacher-dept-stats@test.com",
        password: "Pass@1234",
      });

      await createStudentWithInfo(klass.id, dept.id, {
        email: "student-dept-stats@test.com",
        password: "Pass@1234",
      });

      // Create a society
      const president = await createStudentWithInfo(klass.id, dept.id, {
        email: "president-dept-stats@test.com",
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: "convenor-dept-stats@test.com",
        password: "Pass@1234",
      });
      await createSociety(dept.id, president.id, convenor.id, {
        name: "Stats Society",
        creatorId: admin.id,
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${dept.id}/stats`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.departmentId).toBe(dept.id);
      expect(res.body.data.students).toBe(2); // student + president
      expect(res.body.data.teachers).toBe(2); // teacher + convenor
      expect(res.body.data.classes).toBe(1);
      expect(res.body.data.societies).toBe(1);
    });

    it("should allow HOD to view own department stats", async () => {
      const admin = await createUser({
        email: "admin-hod-dept-stats@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const dept = await createDepartment({ code: "CS-M12-HODSTATS", creatorId: admin.id });
      const hod = await createTeacherWithInfo(dept.id, {
        email: "hod-dept-stats@test.com",
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: dept.id }, data: { hodId: hod.id } });

      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${dept.id}/stats`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.departmentId).toBe(dept.id);
    });

    it("should return 403 when HOD views another department stats", async () => {
      const admin = await createUser({
        email: "admin-hod-other-stats@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const deptA = await createDepartment({ code: "CS-M12-HOD-A", creatorId: admin.id });
      const deptB = await createDepartment({ code: "CS-M12-HOD-B", creatorId: admin.id });

      const hod = await createTeacherWithInfo(deptA.id, {
        email: "hod-other-dept-stats@test.com",
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: deptA.id }, data: { hodId: hod.id } });

      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${deptB.id}/stats`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 403 for non-HOD teacher", async () => {
      const dept = await createDepartment({ code: "CS-M12-NONHOD" });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: "teacher-nonhod-stats@test.com",
        password: "Pass@1234",
      });

      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${dept.id}/stats`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 404 for non-existent department", async () => {
      const admin = await createUser({
        email: "admin-dept-stats-404@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/departments/99999/stats")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 for student", async () => {
      const dept = await createDepartment({ code: "CS-M12-STU-STATS" });
      const student = await createUser({
        email: "student-dept-stats-denied@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${dept.id}/stats`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });
});
