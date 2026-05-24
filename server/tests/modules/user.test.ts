import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createClass,
  createChannel,
  createDepartment,
  createProgram,
  createTeacherWithInfo,
  createUser,
  generateCSV,
  loginAs,
} from "../helpers/factory.js";
import { emailService } from "../../src/config/email.js";
import { VALID_PNG_BUFFER } from "../helpers/fixtures.js";
import { cloudinaryService } from "../../src/config/cloudinary.js";

beforeAll(async () => {
  await resetDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 2 - User Management", () => {
  describe("POST /api/users", () => {
    it("should allow admin to create a student with auto-memberships", async () => {
      const admin = await createUser({
        email: "admin-create-student@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-1" });
      const program = await createProgram(dept.id, { code: "BSCS-M2-1" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);

      const cookies = await loginAs("admin-create-student@test.com", "Pass@1234");

      const res = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "Student One",
          email: "student-one@test.com",
          phone: "03001112222",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: dept.id,
          classId: klass.id,
          rollNumber: "22-NTU-CS-2001",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userType).toBe("STUDENT");
      expect(res.body.data).not.toHaveProperty("tempPassword");

      const createdUserId = res.body.data.id as number;
      const [studentInfo, memberships] = await Promise.all([
        prisma.studentInfo.findUnique({ where: { studentId: createdUserId } }),
        prisma.serverMembership.findMany({ where: { userId: createdUserId } }),
      ]);

      expect(studentInfo?.classId).toBe(klass.id);
      expect(studentInfo?.rollNumber).toBe("22-NTU-CS-2001");
      expect(memberships).toHaveLength(2);
    });

    it("should return 403 for non-admin", async () => {
      const user = await createUser({
        email: "student-non-admin@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "Blocked",
          email: "blocked@test.com",
          phone: "03001112222",
          gender: "MALE",
          userType: "ADMIN",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should create a teacher with department membership", async () => {
      const admin = await createUser({
        email: "admin-create-teacher@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-TEACH" });

      jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "Teacher One",
          email: "teacher-one@test.com",
          phone: "03007778888",
          gender: "FEMALE",
          userType: "TEACHER",
          departmentId: dept.id,
          designation: "Lecturer",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userType).toBe("TEACHER");

      const createdUserId = res.body.data.id as number;
      const [teacherInfo, memberships] = await Promise.all([
        prisma.teacherInfo.findUnique({ where: { teacherId: createdUserId } }),
        prisma.serverMembership.findMany({ where: { userId: createdUserId } }),
      ]);

      expect(teacherInfo?.designation).toBe("Lecturer");
      expect(memberships).toHaveLength(1);
    });

    it("should return 409 for duplicate email", async () => {
      const admin = await createUser({
        email: "admin-duplicate@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-DUP" });
      const program = await createProgram(dept.id, { code: "BSCS-M2-DUP" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);

      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "First User",
          email: "duplicate-user@test.com",
          phone: "03001112222",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: dept.id,
          classId: klass.id,
          rollNumber: "22-NTU-CS-3001",
        });

      const duplicateRes = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "Second User",
          email: "duplicate-user@test.com",
          phone: "03003334444",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: dept.id,
          classId: klass.id,
          rollNumber: "22-NTU-CS-3002",
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe("CONFLICT");
    });

    it("should return 400 for missing student rollNumber", async () => {
      const admin = await createUser({
        email: "admin-missing-roll@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-ROLL" });
      const program = await createProgram(dept.id, { code: "BSCS-M2-ROLL" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "No Roll",
          email: "no-roll@test.com",
          phone: "03001119999",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: dept.id,
          classId: klass.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid student rollNumber format", async () => {
      const admin = await createUser({
        email: "admin-invalid-roll@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-BADROLL" });
      const program = await createProgram(dept.id, { code: "BSCS-M2-BADROLL" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/users")
        .set("Cookie", cookies)
        .send({
          fullName: "Bad Roll",
          email: "bad-roll@test.com",
          phone: "03001118888",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: dept.id,
          classId: klass.id,
          rollNumber: "2022-CS-1184",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/users/bulk-import", () => {
    it("should import valid rows and report invalid rows", async () => {
      const admin = await createUser({
        email: "admin-bulk@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-2", creatorId: admin.id });
      const program = await createProgram(dept.id, { code: "BSCS-M2-2" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);

      const csv = generateCSV([
        {
          fullName: "CSV Student",
          email: "csv-student@test.com",
          phone: "03001112222",
          gender: "FEMALE",
          userType: "STUDENT",
          departmentId: String(dept.id),
          classId: String(klass.id),
          rollNumber: "22-NTU-CS-9901",
          designation: "",
        },
        {
          fullName: "CSV Teacher",
          email: "csv-teacher@test.com",
          phone: "03003334444",
          gender: "MALE",
          userType: "TEACHER",
          departmentId: String(dept.id),
          classId: "",
          rollNumber: "",
          designation: "Lecturer",
        },
        {
          fullName: "Bad Row",
          email: "",
          phone: "03005556666",
          gender: "MALE",
          userType: "STUDENT",
          departmentId: String(dept.id),
          classId: "",
          rollNumber: "",
          designation: "",
        },
      ]);

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app)
        .post("/api/users/bulk-import")
        .set("Cookie", cookies)
        .attach("file", csv, "users.csv");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successful).toBe(2);
      expect(res.body.data.failed).toBe(1);

      const createdCount = await prisma.user.count({
        where: { email: { in: ["csv-student@test.com", "csv-teacher@test.com"] } },
      });
      expect(createdCount).toBe(2);
    });

    it("should return 400 when CSV file is missing", async () => {
      const admin = await createUser({
        email: "admin-bulk-nofile@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app).post("/api/users/bulk-import").set("Cookie", cookies);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should report duplicate email rows in bulk import", async () => {
      const admin = await createUser({
        email: "admin-bulk-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M2-BULKDUP", creatorId: admin.id });
      const program = await createProgram(dept.id, { code: "BSCS-M2-BULKDUP" });
      const klass = await createClass(program.id, { creatorId: admin.id });

      await createUser({
        email: "existing-bulk-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });

      jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);

      const csv = generateCSV([
        {
          fullName: "Duplicate Existing",
          email: "existing-bulk-user@test.com",
          phone: "03001112222",
          gender: "FEMALE",
          userType: "STUDENT",
          departmentId: String(dept.id),
          classId: String(klass.id),
          rollNumber: "22-NTU-CS-9909",
          designation: "",
        },
      ]);

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app)
        .post("/api/users/bulk-import")
        .set("Cookie", cookies)
        .attach("file", csv, "users.csv");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successful).toBe(0);
      expect(res.body.data.failed).toBe(1);
    });
  });

  describe("GET/PATCH /api/users/me", () => {
    it("should return own profile and update bio", async () => {
      const user = await createUser({
        email: "profile-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(user.email, "Pass@1234");

      const profileRes = await request(app).get("/api/users/me").set("Cookie", cookies);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);
      expect(profileRes.body.data.email).toBe(user.email);
      expect(profileRes.body.data).not.toHaveProperty("passwordHash");

      const updateRes = await request(app)
        .patch("/api/users/me")
        .set("Cookie", cookies)
        .send({ bio: "I am a CS student" });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.bio).toBe("I am a CS student");

      const inDb = await prisma.user.findUnique({ where: { id: user.id } });
      expect(inDb?.bio).toBe("I am a CS student");
    });

    it("should return scoped current-user roles for authorization-sensitive UI", async () => {
      const department = await createDepartment({ code: "CS-M2-PROFILE" });
      const teacher = await createTeacherWithInfo(department.id, {
        email: "scoped-roles@test.com",
        password: "Pass@1234",
      });
      const channel = await createChannel(department.serverId, {
        name: "faculty-updates",
        createdBy: teacher.id,
      });

      await prisma.department.update({
        where: { id: department.id },
        data: { hodId: teacher.id },
      });

      await prisma.moderatorAssignment.create({
        data: {
          userId: teacher.id,
          serverId: department.serverId,
          channelId: channel.id,
          scopeType: "CHANNEL",
          assignedBy: teacher.id,
        },
      });

      const cookies = await loginAs(teacher.email, "Pass@1234");
      const profileRes = await request(app).get("/api/users/me").set("Cookie", cookies);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);
      expect(profileRes.body.data.roles).toEqual(
        expect.arrayContaining([
          {
            role: "hod",
            serverId: department.serverId,
            scopeType: "server",
          },
          {
            role: "channel_moderator",
            serverId: department.serverId,
            channelId: channel.id,
            scopeType: "channel",
          },
        ])
      );
    });

    it("should upload profile picture", async () => {
      const user = await createUser({
        email: "profile-pic-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({ url: "https://cloudinary.com/profile/test.jpg" });

      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/users/me/profile-picture")
        .set("Cookie", cookies)
        .attach("profilePicture", VALID_PNG_BUFFER, {
          filename: "profile.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profilePictureUrl).toBe("https://cloudinary.com/profile/test.jpg");
    });

    it("should return 400 for invalid profile picture MIME type", async () => {
      const user = await createUser({
        email: "profile-pic-invalid@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/users/me/profile-picture")
        .set("Cookie", cookies)
        .attach("profilePicture", Buffer.from("not-image"), {
          filename: "profile.txt",
          contentType: "text/plain",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/users", () => {
    it("should allow admin listing with filters", async () => {
      const admin = await createUser({
        email: "admin-list@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      await createUser({
        email: "list-student@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      await createUser({
        email: "list-teacher@test.com",
        password: "Pass@1234",
        userType: "TEACHER",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/users?userType=STUDENT&page=1&limit=20")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((u: { userType: string }) => u.userType === "STUDENT")).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("should allow HOD to list only own department users", async () => {
      const admin = await createUser({
        email: "admin-hod-scope@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const deptA = await createDepartment({ code: "CS-M2-3", creatorId: admin.id });
      const deptB = await createDepartment({ code: "SE-M2-3", creatorId: admin.id });

      const hod = await createTeacherWithInfo(deptA.id, {
        email: "hod@test.com",
        password: "Pass@1234",
      });

      await prisma.department.update({ where: { id: deptA.id }, data: { hodId: hod.id } });

      await createUser({
        email: "dept-a-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: deptA.id,
      });

      await createUser({
        email: "dept-b-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: deptB.id,
      });

      const cookies = await loginAs("hod@test.com", "Pass@1234");
      const res = await request(app).get("/api/users").set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(
        res.body.data.every((user: { departmentId: number | null }) => user.departmentId === deptA.id)
      ).toBe(true);
    });

    it("should return 403 for non-HOD teacher", async () => {
      const dept = await createDepartment({ code: "CS-M2-NONHOD" });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: "regular-teacher@test.com",
        password: "Pass@1234",
      });

      const cookies = await loginAs(teacher.email, "Pass@1234");
      const res = await request(app).get("/api/users").set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 403 for non-admin/non-teacher user", async () => {
      const student = await createUser({
        email: "student-list-denied@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(student.email, "Pass@1234");
      const res = await request(app).get("/api/users").set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /api/users/:id", () => {
    it("should allow admin to fetch a user by id", async () => {
      const admin = await createUser({
        email: "admin-getbyid@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const target = await createUser({
        email: "target-getbyid@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app).get(`/api/users/${target.id}`).set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(target.id);
      expect(res.body.data).not.toHaveProperty("passwordHash");
    });

    it("should allow HOD to fetch user in own department", async () => {
      const admin = await createUser({
        email: "admin-get-hod@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const deptA = await createDepartment({ code: "CS-M2-GETHOD-A", creatorId: admin.id });
      const deptB = await createDepartment({ code: "CS-M2-GETHOD-B", creatorId: admin.id });

      const hod = await createTeacherWithInfo(deptA.id, {
        email: "hod-getbyid@test.com",
        password: "Pass@1234",
      });
      await prisma.department.update({ where: { id: deptA.id }, data: { hodId: hod.id } });

      const inDeptUser = await createUser({
        email: "in-dept-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: deptA.id,
      });
      const outDeptUser = await createUser({
        email: "out-dept-user@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: deptB.id,
      });

      const hodCookies = await loginAs(hod.email, "Pass@1234");

      const ownRes = await request(app)
        .get(`/api/users/${inDeptUser.id}`)
        .set("Cookie", hodCookies);

      expect(ownRes.status).toBe(200);
      expect(ownRes.body.success).toBe(true);
      expect(ownRes.body.data.id).toBe(inDeptUser.id);

      const outRes = await request(app)
        .get(`/api/users/${outDeptUser.id}`)
        .set("Cookie", hodCookies);

      expect(outRes.status).toBe(404);
      expect(outRes.body.success).toBe(false);
      expect(outRes.body.error.code).toBe("NOT_FOUND");
    });

    it("should return 403 for non-HOD teacher on get by id", async () => {
      const dept = await createDepartment({ code: "CS-M2-GET-NONHOD" });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: "teacher-get-denied@test.com",
        password: "Pass@1234",
      });
      const target = await createUser({
        email: "target-get-denied@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
        departmentId: dept.id,
      });

      const cookies = await loginAs(teacher.email, "Pass@1234");
      const res = await request(app)
        .get(`/api/users/${target.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("PATCH /api/users/:id/deactivate & reactivate", () => {
    it("should deactivate and reactivate user with admin access", async () => {
      const admin = await createUser({
        email: "admin-deactivate@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const target = await createUser({
        email: "deactivate-target@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const deactivateRes = await request(app)
        .patch(`/api/users/${target.id}/deactivate`)
        .set("Cookie", cookies);

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.success).toBe(true);

      const loginAfterDeactivate = await request(app)
        .post("/api/auth/login")
        .send({ email: target.email, password: "Pass@1234" });

      expect(loginAfterDeactivate.status).toBe(401);

      const reactivateRes = await request(app)
        .patch(`/api/users/${target.id}/reactivate`)
        .set("Cookie", cookies);

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.success).toBe(true);

      const loginAfterReactivate = await request(app)
        .post("/api/auth/login")
        .send({ email: target.email, password: "Pass@1234" });

      expect(loginAfterReactivate.status).toBe(200);

      const activeTokenCount = await prisma.refreshToken.count({
        where: { userId: target.id, revokedAt: null },
      });
      expect(activeTokenCount).toBeGreaterThan(0);
    });

    it("should revoke all refresh tokens when deactivated", async () => {
      const admin = await createUser({
        email: "admin-revoke@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const target = await createUser({
        email: "target-revoke@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      await loginAs(target.email, "Pass@1234");
      await loginAs(target.email, "Pass@1234");

      const before = await prisma.refreshToken.count({
        where: { userId: target.id, revokedAt: null },
      });
      expect(before).toBeGreaterThan(0);

      const adminCookies = await loginAs(admin.email, "Pass@1234");
      const deactivateRes = await request(app)
        .patch(`/api/users/${target.id}/deactivate`)
        .set("Cookie", adminCookies);

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.success).toBe(true);

      const after = await prisma.refreshToken.count({
        where: { userId: target.id, revokedAt: null },
      });
      expect(after).toBe(0);
    });

    it("should return 403 when non-admin tries to deactivate", async () => {
      const actor = await createUser({
        email: "non-admin-deactivate@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const target = await createUser({
        email: "target-non-admin@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(actor.email, "Pass@1234");
      const res = await request(app)
        .patch(`/api/users/${target.id}/deactivate`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 403 when admin tries to deactivate self", async () => {
      const admin = await createUser({
        email: "admin-self-deactivate@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app)
        .patch(`/api/users/${admin.id}/deactivate`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should return 409 when deactivating an already deactivated user", async () => {
      const admin = await createUser({
        email: "admin-double-deactivate@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const target = await createUser({
        email: "target-double-deactivate@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");
      await request(app).patch(`/api/users/${target.id}/deactivate`).set("Cookie", cookies);

      const res = await request(app)
        .patch(`/api/users/${target.id}/deactivate`)
        .set("Cookie", cookies);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 409 when reactivating an already active user", async () => {
      const admin = await createUser({
        email: "admin-reactivate-active@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const target = await createUser({
        email: "target-reactivate-active@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });

      const cookies = await loginAs(admin.email, "Pass@1234");
      const res = await request(app)
        .patch(`/api/users/${target.id}/reactivate`)
        .set("Cookie", cookies);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });
});
