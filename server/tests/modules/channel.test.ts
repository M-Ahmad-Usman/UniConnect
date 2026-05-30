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
  createSociety,
  createChannel,
  createCourse,
  assignHOD,
  assignCR,
  assignPD,
  addServerMembership,
  loginAs,
  seedRolesAndPermissions,
  createPlatformRoleAssignment,
} from "../helpers/factory.js";
import { canPostInChannel } from "../../src/modules/channel/channel.service.js";

/** Short unique suffix */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

beforeAll(async () => {
  await resetDB();
  await seedRolesAndPermissions();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 8 - Server & Channel Management (Channel Endpoints)", () => {
  // ─── PATCH /api/channels/:id ─────────────────────────────────────────

  describe("PATCH /api/channels/:id", () => {
    it("should allow HOD to update a channel in their dept server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UPD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-upd-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, { name: `update-me-${u}` });
      const cookies = await loginAs(`hod-upd-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({ name: `updated-${u}`, description: "Updated description" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(`updated-${u}`);
      expect(res.body.data.description).toBe("Updated description");
    });

    it("should allow admin to update any channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ADMU-${u}` });
      const channel = await createChannel(dept.serverId, { name: `adm-upd-${u}` });
      const admin = await createUser({
        email: `admin-upd-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-upd-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({ description: "Admin updated" });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe("Admin updated");
    });

    it("should return 409 for duplicate channel name in same server", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DUPU-${u}` });
      await createChannel(dept.serverId, { name: `existing-${u}` });
      const channel = await createChannel(dept.serverId, { name: `rename-me-${u}` });
      const admin = await createUser({
        email: `admin-dupu-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-dupu-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({ name: `existing-${u}` });

      expect(res.status).toBe(409);
    });

    it("should return 404 for deleted channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DELU-${u}` });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `deleted-upd-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      const admin = await createUser({
        email: `admin-delu-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-delu-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({ name: `new-name-${u}` });

      expect(res.status).toBe(404);
    });

    it("should return 403 for unauthorized user", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNAU-${u}` });
      const channel = await createChannel(dept.serverId, { name: `unauth-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-unau-${u}@test.com`,
      });
      // Teacher without HOD role
      const cookies = await loginAs(`teacher-unau-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({ name: `fail-${u}` });

      expect(res.status).toBe(403);
    });

    it("should return 400 when no fields provided", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-nofld-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `NFL-${u}` });
      const channel = await createChannel(dept.serverId, { name: `nofld-${u}` });
      const cookies = await loginAs(`admin-nofld-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── PATCH /api/channels/:id/lock ────────────────────────────────────

  describe("PATCH /api/channels/:id/lock", () => {
    it("should allow HOD to lock a channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LOCK-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-lock-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, { name: `lock-me-${u}` });
      const cookies = await loginAs(`hod-lock-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/lock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isLocked).toBe(true);

      // Verify in DB
      const dbChannel = await prisma.channel.findUnique({ where: { id: channel.id } });
      expect(dbChannel!.isLocked).toBe(true);
      expect(dbChannel!.lockedBy).toBe(hod.id);
      expect(dbChannel!.lockedAt).not.toBeNull();
    });

    it("should allow admin to lock any channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ADMLOCK-${u}` });
      const channel = await createChannel(dept.serverId, { name: `adm-lock-${u}` });
      const admin = await createUser({
        email: `admin-lock-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-lock-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/lock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(true);
    });

    it("should allow CR to lock a channel in class server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRLOCK-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-lock-${u}@test.com`,
      });
      await assignCR(cls.id, student.id);
      const channel = await createChannel(cls.serverId, { name: `cr-lock-${u}` });
      const cookies = await loginAs(`cr-lock-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/lock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(true);
    });

    it("should return 400 when channel is already locked", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ALRDL-${u}` });
      const admin = await createUser({
        email: `admin-alrdl-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `already-locked-${u}`,
          type: "GENERAL",
          isLocked: true,
          lockedBy: admin.id,
          lockedAt: new Date(),
        },
      });
      const cookies = await loginAs(`admin-alrdl-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/lock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
    });

    it("should return 403 for unauthorized user", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LOCKUN-${u}` });
      const channel = await createChannel(dept.serverId, { name: `lock-unauth-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-lockun-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-lockun-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/lock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });
  });

  // ─── PATCH /api/channels/:id/unlock ──────────────────────────────────

  describe("PATCH /api/channels/:id/unlock", () => {
    it("should allow HOD to unlock a locked channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-unl-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `unlock-me-${u}`,
          type: "GENERAL",
          isLocked: true,
          lockedBy: hod.id,
          lockedAt: new Date(),
        },
      });
      const cookies = await loginAs(`hod-unl-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/unlock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(false);

      // Verify in DB
      const dbChannel = await prisma.channel.findUnique({ where: { id: channel.id } });
      expect(dbChannel!.isLocked).toBe(false);
      expect(dbChannel!.lockedBy).toBeNull();
      expect(dbChannel!.lockedAt).toBeNull();
    });

    it("should return 400 when channel is not locked", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NOTL-${u}` });
      const channel = await createChannel(dept.serverId, { name: `not-locked-${u}` });
      const admin = await createUser({
        email: `admin-notl-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-notl-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/unlock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
    });

    it("should return 403 for unauthorized user", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNLUN-${u}` });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `unl-unauth-${u}`,
          type: "GENERAL",
          isLocked: true,
          lockedAt: new Date(),
        },
      });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-unlun-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-unlun-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/channels/${channel.id}/unlock`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE /api/channels/:id ────────────────────────────────────────

  describe("DELETE /api/channels/:id", () => {
    it("should allow HOD to soft-delete a channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DEL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-del-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, { name: `delete-me-${u}` });
      const cookies = await loginAs(`hod-del-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();

      // Verify soft delete in DB
      const dbChannel = await prisma.channel.findUnique({ where: { id: channel.id } });
      expect(dbChannel!.isDeleted).toBe(true);
      expect(dbChannel!.deletedBy).toBe(hod.id);
      expect(dbChannel!.deletedAt).not.toBeNull();
    });

    it("should allow admin to delete any channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ADMDEL-${u}` });
      const channel = await createChannel(dept.serverId, { name: `adm-del-${u}` });
      const admin = await createUser({
        email: `admin-del-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-del-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
    });

    it("should return 400 when trying to delete auto-created channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AUTOCR-${u}` });
      const channel = await createChannel(dept.serverId, {
        name: `auto-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      const admin = await createUser({
        email: `admin-auto-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-auto-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Auto-created channels cannot be deleted");
    });

    it("should return 400 when trying to delete auto-created program channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AUTOPG-${u}` });
      const program = await createProgram(dept.id);
      const channel = await createChannel(dept.serverId, {
        name: `program-${u}`,
        type: "PROGRAM",
        isAutoCreated: true,
        programId: program.id,
      });
      const admin = await createUser({
        email: `admin-autopg-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-autopg-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
    });

    it("should return 404 for already deleted channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ALRDEL-${u}` });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `already-del-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      const admin = await createUser({
        email: `admin-alrdel-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-alrdel-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
    });

    it("should return 403 for unauthorized user", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DELUN-${u}` });
      const channel = await createChannel(dept.serverId, { name: `del-unauth-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-delun-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-delun-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });

    it("should allow society president to delete channel in society server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SDEL-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-del-${u}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-del-${u}@test.com`,
      });
      const { server: socServer } = await createSociety(dept.id, president.id, convenor.id, {
        name: `SocDel-${u}`,
      });
      const channel = await createChannel(socServer.id, { name: `soc-del-${u}` });
      const cookies = await loginAs(`pres-del-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/channels/${channel.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
    });
  });

  // ─── canPostInChannel ────────────────────────────────────────────────

  describe("canPostInChannel", () => {
    it("should return true for admin", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-ADM-${u}` });
      const channel = await createChannel(dept.serverId, { name: `cpc-adm-${u}` });
      const admin = await createUser({
        email: `admin-cpc-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });

      const result = await canPostInChannel(admin.id, "ADMIN", channel.id);
      expect(result).toBe(true);
    });

    it("should return true for HOD in department server", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-HOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cpc-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `cpc-hod-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });

      const result = await canPostInChannel(hod.id, "TEACHER", channel.id);
      expect(result).toBe(true);
    });

    it("should return true for PD in their program channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-PD-${u}` });
      const program = await createProgram(dept.id);
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-cpc-${u}@test.com`,
      });
      await assignPD(program.id, pd.id);
      const channel = await createChannel(dept.serverId, {
        name: `cpc-pd-${u}`,
        type: "PROGRAM",
        isAutoCreated: true,
        programId: program.id,
      });

      const result = await canPostInChannel(pd.id, "TEACHER", channel.id);
      expect(result).toBe(true);
    });

    it("should return false for PD in another program's channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-PDO-${u}` });
      const program1 = await createProgram(dept.id, { code: `P1-${u}` });
      const program2 = await createProgram(dept.id, { code: `P2-${u}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-other-cpc-${u}@test.com`,
      });
      await assignPD(program1.id, pd.id);
      const channel = await createChannel(dept.serverId, {
        name: `cpc-pdo-${u}`,
        type: "PROGRAM",
        isAutoCreated: true,
        programId: program2.id,
      });

      const result = await canPostInChannel(pd.id, "TEACHER", channel.id);
      expect(result).toBe(false);
    });

    it("should return true for CR in class server", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-CR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-cpc-${u}@test.com`,
      });
      await assignCR(cls.id, student.id);
      const channel = await createChannel(cls.serverId, {
        name: `cpc-cr-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });

      const result = await canPostInChannel(student.id, "STUDENT", channel.id);
      expect(result).toBe(true);
    });

    it("should return true for teacher in their assigned course channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-TCH-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-cpc-${u}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `CRS-${u}` });

      // Assign teacher to course in class
      await prisma.teaches.create({
        data: {
          teacherId: teacher.id,
          courseId: course.id,
          classId: cls.id,
        },
      });

      // Add teacher as class server member
      await addServerMembership(teacher.id, cls.serverId);

      // Create course channel
      const channel = await createChannel(cls.serverId, {
        name: `crs-${u}`,
        type: "COURSE",
        isAutoCreated: true,
        courseId: course.id,
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(true);
    });

    it("should return false for teacher not assigned to the course", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-TNO-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-no-cpc-${u}@test.com`,
      });
      const course = await createCourse(dept.id, { code: `CRS-NO-${u}` });

      // Teacher is member but not assigned
      await addServerMembership(teacher.id, cls.serverId);

      const channel = await createChannel(cls.serverId, {
        name: `crs-no-${u}`,
        type: "COURSE",
        isAutoCreated: true,
        courseId: course.id,
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(false);
    });

    it("should return true for any member in GENERAL channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-GEN-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-gen-${u}@test.com`,
      });
      const channel = await createChannel(dept.serverId, {
        name: `cpc-gen-${u}`,
        type: "GENERAL",
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(true);
    });

    it("should return false for non-member", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-NM-${u}` });
      const otherDept = await createDepartment({ code: `CPC-NMO-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-nm-cpc-${u}@test.com`,
      });
      const channel = await createChannel(dept.serverId, {
        name: `cpc-nm-${u}`,
        type: "GENERAL",
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(false);
    });

    it("should return false for locked channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-LK-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-lk-${u}@test.com`,
      });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `cpc-locked-${u}`,
          type: "GENERAL",
          isLocked: true,
          lockedAt: new Date(),
        },
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(false);
    });

    it("should return true for server moderator in any channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-MOD-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `mod-cpc-${u}@test.com`,
      });

      // Assign as server moderator
      await createPlatformRoleAssignment({
        userId: teacher.id,
        role: "server_moderator",
        serverId: dept.serverId,
        assignedBy: teacher.id,
      });

      const channel = await createChannel(dept.serverId, {
        name: `cpc-mod-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });

      const result = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result).toBe(true);
    });

    it("should return true for channel moderator in assigned channel only", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-CHM-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `chmod-cpc-${u}@test.com`,
      });

      const channel1 = await createChannel(dept.serverId, {
        name: `cpc-chm1-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      const channel2 = await createChannel(dept.serverId, {
        name: `cpc-chm2-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });

      // Assign as channel moderator for channel1 only
      await createPlatformRoleAssignment({
        userId: teacher.id,
        role: "channel_moderator",
        serverId: dept.serverId,
        channelId: channel1.id,
        assignedBy: teacher.id,
      });

      const result1 = await canPostInChannel(teacher.id, "TEACHER", channel1.id);
      expect(result1).toBe(true);

      const result2 = await canPostInChannel(teacher.id, "TEACHER", channel2.id);
      expect(result2).toBe(false);
    });

    it("should return false for deleted channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CPC-DL-${u}` });
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `cpc-deleted-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-cpc-dl-${u}@test.com`,
      });
      const result2 = await canPostInChannel(teacher.id, "TEACHER", channel.id);
      expect(result2).toBe(false);
    });
  });
});
