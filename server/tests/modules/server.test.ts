import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { cloudinaryService } from "../../src/config/cloudinary.js";
import { resetDB } from "../helpers/db.helper.js";
import { VALID_JPEG_BUFFER } from "../helpers/fixtures.js";
import {
  createUser,
  createDepartment,
  createProgram,
  createClass,
  createTeacherWithInfo,
  createStudentWithInfo,
  createSociety,
  createChannel,
  assignHOD,
  assignCR,
  assignPD,
  addServerMembership,
  loginAs,
  seedRolesAndPermissions,
  apiId,
  apiServerId,
} from "../helpers/factory.js";

/** Short unique suffix */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

const UNKNOWN_SERVER_PUBLIC_ID = "0198f1f0-0000-7000-8000-000000000999";

beforeAll(async () => {
  await resetDB();
  await seedRolesAndPermissions();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Server management endpoints", () => {
  // ─── GET /api/servers ────────────────────────────────────────────────

  describe("GET /api/servers", () => {
    it("should return only servers the user is a member of → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SRV-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      // Student is auto-joined to dept + class servers
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-srv-list-${u}@test.com`,
      });
      const cookies = await loginAs(`stu-srv-list-${u}@test.com`, "Pass@1234");

      // Create another department the student is NOT a member of
      await createDepartment({ code: `OTHER-SRV-${u}` });

      const res = await request(app).get("/api/servers").set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2); // dept + class
      // All returned servers should include ones the student is a member of
      const serverPublicIds = res.body.data.map((s: { publicId: string }) => s.publicId);
      expect(serverPublicIds).toContain(await apiServerId(dept.serverId));
      expect(serverPublicIds).toContain(await apiServerId(cls.serverId));
    });

    it("should allow admin to list all servers → 200", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-srv-list-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(
        `admin-srv-list-${u}@test.com`,
        "Pass@1234",
      );

      const res = await request(app).get("/api/servers").set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should filter servers by type → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `FLT-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-flt-${u}@test.com`,
      });
      const cookies = await loginAs(`stu-flt-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/servers?type=DEPARTMENT")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const server of res.body.data) {
        expect(server.type).toBe("DEPARTMENT");
      }
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/servers");
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/servers/:id ────────────────────────────────────────────

  describe("GET /api/servers/:id", () => {
    it("should return server details for a member → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DET-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-det-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-det-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publicId).toBe(await apiServerId(dept.serverId));
      expect(res.body.data.type).toBe("DEPARTMENT");
      expect(res.body.data.department).toBeDefined();
      expect(res.body.data.department.id).toBe(dept.id);
    });

    it("should return 403 for non-member → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NM-${u}` });
      const otherDept = await createDepartment({ code: `OTH-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-nm-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-nm-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });

    it("should return 404 for non-existent server", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-ne-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-ne-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${UNKNOWN_SERVER_PUBLIC_ID}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
    });

    it("should allow admin to view any server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ADM-${u}` });
      const admin = await createUser({
        email: `admin-any-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-any-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.publicId).toBe(await apiServerId(dept.serverId));
    });
  });

  // ─── GET /api/servers/:id/channels ───────────────────────────────────

  describe("GET /api/servers/:id/channels", () => {
    it("should return channels for a member → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CH-${u}` });
      // Create some channels in the department server
      await createChannel(dept.serverId, {
        name: `announcements-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      await createChannel(dept.serverId, {
        name: `general-${u}`,
        type: "GENERAL",
      });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-ch-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-ch-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should exclude deleted and archived channels", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DEL-${u}` });
      await createChannel(dept.serverId, {
        name: `active-${u}`,
        type: "GENERAL",
      });

      // Create a deleted channel
      await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `deleted-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      // Create an archived channel
      await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `archived-${u}`,
          type: "GENERAL",
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-del-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-del-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const names = res.body.data.map((c: { name: string }) => c.name);
      expect(names).toContain(`active-${u}`);
      expect(names).not.toContain(`deleted-${u}`);
      expect(names).not.toContain(`archived-${u}`);
    });

    it("should return 403 for non-member", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CHNM-${u}` });
      const otherDept = await createDepartment({ code: `CHOTH-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-chnm-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-chnm-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });

    it("should include archived channels when includeArchived=true", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ARCH-${u}` });
      await createChannel(dept.serverId, {
        name: `active-arch-${u}`,
        type: "GENERAL",
      });

      // Create an archived channel
      await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `archived-inc-${u}`,
          type: "GENERAL",
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      // Create a deleted channel (should never be returned)
      await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `deleted-inc-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-arch-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-arch-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/channels?includeArchived=true`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const names = res.body.data.map((c: { name: string }) => c.name);
      expect(names).toContain(`active-arch-${u}`);
      expect(names).toContain(`archived-inc-${u}`);
      expect(names).not.toContain(`deleted-inc-${u}`);

      // Verify isArchived field is present in response
      const archivedChannel = res.body.data.find(
        (c: { name: string }) => c.name === `archived-inc-${u}`,
      );
      expect(archivedChannel.isArchived).toBe(true);
    });

    it("should exclude archived channels by default (includeArchived not set)", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ARCHD-${u}` });
      await createChannel(dept.serverId, {
        name: `active-def-${u}`,
        type: "GENERAL",
      });

      await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `archived-def-${u}`,
          type: "GENERAL",
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      const teacher = await createTeacherWithInfo(dept.id, {
        email: `teacher-archd-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-archd-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const names = res.body.data.map((c: { name: string }) => c.name);
      expect(names).toContain(`active-def-${u}`);
      expect(names).not.toContain(`archived-def-${u}`);
    });
  });

  // ─── GET /api/servers/:id/members ────────────────────────────────────

  describe("GET /api/servers/:id/members", () => {
    it("should return members with role badges for department server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `MEM-${u}` });
      const hodTeacher = await createTeacherWithInfo(dept.id, {
        email: `hod-mem-${u}@test.com`,
      });
      await assignHOD(dept.id, hodTeacher.id);

      const program = await createProgram(dept.id);
      const pdTeacher = await createTeacherWithInfo(dept.id, {
        email: `pd-mem-${u}@test.com`,
      });
      await assignPD(program.id, pdTeacher.id);

      const cookies = await loginAs(`hod-mem-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Find the HOD member and check badges
      const hodMember = res.body.data.find(
        (m: { user: { publicId: string } }) => m.user.publicId === hodTeacher.publicId,
      );
      expect(hodMember).toBeDefined();
      expect(hodMember.badges).toContain("hod");

      // Find the PD member and check badges
      const pdMember = res.body.data.find(
        (m: { user: { publicId: string } }) => m.user.publicId === pdTeacher.publicId,
      );
      expect(pdMember).toBeDefined();
      expect(pdMember.badges).toContain("program_director");
    });

    it("should return members with role badges for class server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CMB-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-cmb-${u}@test.com`,
      });
      await assignCR(cls.id, student1.id);

      const cookies = await loginAs(`cr-cmb-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(cls.serverId)}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const crMember = res.body.data.find(
        (m: { user: { publicId: string } }) => m.user.publicId === student1.publicId,
      );
      expect(crMember).toBeDefined();
      expect(crMember.badges).toContain("cr");
    });

    it("should return members with role badges for society server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SMB-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-smb-${u}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-smb-${u}@test.com`,
      });

      const { server: socServer } = await createSociety(
        dept.id,
        president.id,
        convenor.id,
        {
          name: `Society-${u}`,
        },
      );

      const cookies = await loginAs(`pres-smb-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${apiId(socServer)}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const presMember = res.body.data.find(
        (m: { user: { publicId: string } }) => m.user.publicId === president.publicId,
      );
      expect(presMember).toBeDefined();
      expect(presMember.badges).toContain("president");

      const convMember = res.body.data.find(
        (m: { user: { publicId: string } }) => m.user.publicId === convenor.publicId,
      );
      expect(convMember).toBeDefined();
      expect(convMember.badges).toContain("convenor");
    });

    it("should return 403 for non-member", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `MEMNM-${u}` });
      const otherDept = await createDepartment({ code: `MEMOTH-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `teacher-memnm-${u}@test.com`,
      });
      const cookies = await loginAs(`teacher-memnm-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/members`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
    });

    it("should paginate members", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PAGE-${u}` });
      // Add a few teachers
      for (let i = 0; i < 3; i++) {
        await createTeacherWithInfo(dept.id, {
          email: `t-page-${u}-${i}@test.com`,
        });
      }

      const admin = await createUser({
        email: `admin-page-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-page-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/servers/${await apiServerId(dept.serverId)}/members?page=1&limit=2`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  // ─── POST /api/servers/:id/channels ──────────────────────────────────

  describe("POST /api/servers/:id/channels", () => {
    it("should allow HOD to create a channel in department server → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRHOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cr-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      const cookies = await loginAs(`hod-cr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `test-channel-${u}`, description: "A test channel" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(`test-channel-${u}`);
      expect(res.body.data.type).toBe("GENERAL");
      expect(res.body.data.isAutoCreated).toBe(false);

      // verify in DB
      const channel = await prisma.channel.findFirst({
        where: { serverId: dept.serverId, name: `test-channel-${u}` },
      });
      expect(channel).not.toBeNull();
    });

    it("should allow CR to create a channel in class server → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRCR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-cr-${u}@test.com`,
      });
      await assignCR(cls.id, student.id);
      const cookies = await loginAs(`cr-cr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(cls.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `cr-channel-${u}` });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(`cr-channel-${u}`);
    });

    it("should allow society president to create a channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRPRES-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-cr-${u}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-cr-${u}@test.com`,
      });
      const { server: socServer } = await createSociety(
        dept.id,
        president.id,
        convenor.id,
        {
          name: `SocCR-${u}`,
        },
      );
      const cookies = await loginAs(`pres-cr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${apiId(socServer)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `soc-channel-${u}` });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(`soc-channel-${u}`);
    });

    it("should allow society convenor to create a channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CRCONV-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-conv-${u}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-conv-${u}@test.com`,
      });
      const { server: socServer } = await createSociety(
        dept.id,
        president.id,
        convenor.id,
        {
          name: `SocConv-${u}`,
        },
      );
      const cookies = await loginAs(`conv-conv-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${apiId(socServer)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `conv-channel-${u}` });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(`conv-channel-${u}`);
    });

    it("should return 403 when HOD tries to create in another dept server", async () => {
      const u = uid();
      const dept1 = await createDepartment({ code: `HOD1-${u}` });
      const dept2 = await createDepartment({ code: `HOD2-${u}` });
      const hod = await createTeacherWithInfo(dept1.id, {
        email: `hod-other-${u}@test.com`,
      });
      await assignHOD(dept1.id, hod.id);
      const cookies = await loginAs(`hod-other-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(dept2.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `should-fail-${u}` });

      expect(res.status).toBe(403);
    });

    it("should return 403 for student without role", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NROLE-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-nrole-${u}@test.com`,
      });
      const cookies = await loginAs(`stu-nrole-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `should-fail-${u}` });

      expect(res.status).toBe(403);
    });

    it("should allow admin to create a channel in any server → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ADMCR-${u}` });
      const admin = await createUser({
        email: `admin-cr-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-cr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `admin-channel-${u}` });

      expect(res.status).toBe(201);
    });

    it("should return 409 for duplicate channel name in same server", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DUP-${u}` });
      await createChannel(dept.serverId, { name: `dup-channel-${u}` });

      const admin = await createUser({
        email: `admin-dup-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-dup-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${await apiServerId(dept.serverId)}/channels`)
        .set("Cookie", cookies)
        .send({ name: `dup-channel-${u}` });

      expect(res.status).toBe(409);
    });

    it("should return 404 for non-existent server", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-ne-srv-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-ne-srv-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/servers/${UNKNOWN_SERVER_PUBLIC_ID}/channels`)
        .set("Cookie", cookies)
        .send({ name: `channel-${u}` });

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /api/servers/:id/icon ─────────────────────────────────────

  describe("PATCH /api/servers/:id/icon", () => {
    it("should allow HOD to update the department server icon → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ICON-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-icon-${u}@test.com`,
      });
      await assignHOD(dept.id, hod.id);
      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({
          url: `https://res.cloudinary.com/test/server-icons/${u}.jpg`,
          publicId: `server-icons/${u}`,
        });

      const cookies = await loginAs(`hod-icon-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/servers/${await apiServerId(dept.serverId)}/icon`)
        .set("Cookie", cookies)
        .attach("serverIcon", VALID_JPEG_BUFFER, {
          filename: "server.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.iconUrl).toBe(
        `https://res.cloudinary.com/test/server-icons/${u}.jpg`,
      );

      const server = await prisma.server.findUnique({
        where: { id: dept.serverId },
        select: { iconUrl: true },
      });
      expect(server?.iconUrl).toBe(
        `https://res.cloudinary.com/test/server-icons/${u}.jpg`,
      );
    });

    it("should reject a regular member updating server icon → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ICON-DENY-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-icon-deny-${u}@test.com`,
      });

      const cookies = await loginAs(`stu-icon-deny-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/servers/${await apiServerId(dept.serverId)}/icon`)
        .set("Cookie", cookies)
        .attach("serverIcon", VALID_JPEG_BUFFER, {
          filename: "server.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(403);
    });
  });
});
