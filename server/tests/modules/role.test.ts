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
  assignHOD,
  assignCR,
  assignPD,
  addServerMembership,
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

describe("Module 7 - Role Management", () => {
  describe("Module 4 hardening scoped option endpoints", () => {
    it("should return admin assignable roles without society leadership roles", async () => {
      const admin = await createUser({
        email: `admin-options-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app).get("/api/roles/assignable").set("Cookie", cookies);

      expect(res.status).toBe(200);
      const roles = res.body.data.map((option: { role: string }) => option.role);
      expect(roles).toEqual(
        expect.arrayContaining([
          "hod",
          "program_director",
          "cr",
          "server_moderator",
          "channel_moderator",
        ])
      );
      expect(roles).not.toContain("society_president");
      expect(roles).not.toContain("society_convenor");
    });

    it("should return only HOD department program scopes and mark filled scopes disabled", async () => {
      const ownDept = await createDepartment({ code: `OPTHOD-${uid()}` });
      const otherDept = await createDepartment({ code: `OPTOUT-${uid()}` });
      const hod = await createTeacherWithInfo(ownDept.id, {
        email: `hod-options-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(ownDept.id, hod.id);
      const vacantProgram = await createProgram(ownDept.id, { code: `VP-${uid()}` });
      const filledProgram = await createProgram(ownDept.id, { code: `FP-${uid()}` });
      const otherProgram = await createProgram(otherDept.id, { code: `OP-${uid()}` });
      const pd = await createTeacherWithInfo(ownDept.id, {
        email: `pd-options-${uid()}@test.com`,
      });
      await assignPD(filledProgram.id, pd.id);
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .get("/api/roles/assignable-scopes")
        .query({ role: "program_director", limit: 50 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const scopeIds = res.body.data.map((scope: { id: number }) => scope.id);
      expect(scopeIds).toContain(vacantProgram.id);
      expect(scopeIds).toContain(filledProgram.id);
      expect(scopeIds).not.toContain(otherProgram.id);
      expect(
        res.body.data.find((scope: { id: number; disabled: boolean }) => scope.id === filledProgram.id)
          .disabled
      ).toBe(true);
    });

    it("should scope PD CR options to own active program classes", async () => {
      const dept = await createDepartment({ code: `OPTPD-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-scope-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const ownProgram = await createProgram(dept.id, { code: `OWN-${uid()}` });
      const otherProgram = await createProgram(dept.id, { code: `OTH-${uid()}` });
      await assignPD(ownProgram.id, pd.id);
      const ownClass = await createClass(ownProgram.id);
      const otherClass = await createClass(otherProgram.id);
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .get("/api/roles/assignable-scopes")
        .query({ role: "cr", limit: 50 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const scopeIds = res.body.data.map((scope: { id: number }) => scope.id);
      expect(scopeIds).toContain(ownClass.id);
      expect(scopeIds).not.toContain(otherClass.id);
    });

    it("should limit CR moderator scopes and candidates to own class server members", async () => {
      const dept = await createDepartment({ code: `OPTCR-${uid()}` });
      const program = await createProgram(dept.id);
      const ownClass = await createClass(program.id, { section: "A" });
      const otherClass = await createClass(program.id, { section: "B" });
      const cr = await createStudentWithInfo(ownClass.id, dept.id, {
        email: `cr-options-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const member = await createStudentWithInfo(ownClass.id, dept.id, {
        email: `member-options-${uid()}@test.com`,
      });
      const outsider = await createStudentWithInfo(otherClass.id, dept.id, {
        email: `outsider-options-${uid()}@test.com`,
      });
      await assignCR(ownClass.id, cr.id);
      const [ownRecord, otherRecord] = await Promise.all([
        prisma.class.findUnique({ where: { id: ownClass.id }, select: { serverId: true } }),
        prisma.class.findUnique({ where: { id: otherClass.id }, select: { serverId: true } }),
      ]);
      const cookies = await loginAs(cr.email, "Pass@1234");

      const scopesRes = await request(app)
        .get("/api/roles/assignable-scopes")
        .query({ role: "server_moderator", limit: 50 })
        .set("Cookie", cookies);
      expect(scopesRes.status).toBe(200);
      const serverIds = scopesRes.body.data.map((scope: { serverId: number }) => scope.serverId);
      expect(serverIds).toContain(ownRecord!.serverId);
      expect(serverIds).not.toContain(otherRecord!.serverId);

      const usersRes = await request(app)
        .get("/api/roles/assignable-users")
        .query({ role: "server_moderator", serverId: ownRecord!.serverId, limit: 50 })
        .set("Cookie", cookies);
      expect(usersRes.status).toBe(200);
      const userIds = usersRes.body.data.map((user: { id: number }) => user.id);
      expect(userIds).toContain(member.id);
      expect(userIds).not.toContain(outsider.id);
    });

    it("should return only caller-revokable moderator assignments", async () => {
      const dept = await createDepartment({ code: `OPTREV-${uid()}` });
      const program = await createProgram(dept.id);
      const ownClass = await createClass(program.id, { section: "A" });
      const otherClass = await createClass(program.id, { section: "B" });
      const cr = await createStudentWithInfo(ownClass.id, dept.id, {
        email: `cr-revoke-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignCR(ownClass.id, cr.id);
      const ownMember = await createStudentWithInfo(ownClass.id, dept.id, {
        email: `own-revoke-${uid()}@test.com`,
      });
      const otherMember = await createStudentWithInfo(otherClass.id, dept.id, {
        email: `other-revoke-${uid()}@test.com`,
      });
      const [ownRecord, otherRecord] = await Promise.all([
        prisma.class.findUnique({ where: { id: ownClass.id }, select: { serverId: true } }),
        prisma.class.findUnique({ where: { id: otherClass.id }, select: { serverId: true } }),
      ]);
      await prisma.moderatorAssignment.createMany({
        data: [
          {
            userId: ownMember.id,
            serverId: ownRecord!.serverId,
            scopeType: "SERVER",
            assignedBy: cr.id,
          },
          {
            userId: otherMember.id,
            serverId: otherRecord!.serverId,
            scopeType: "SERVER",
            assignedBy: cr.id,
          },
        ],
      });
      const cookies = await loginAs(cr.email, "Pass@1234");

      const res = await request(app)
        .get("/api/roles/revokable")
        .query({ role: "server_moderator", limit: 50 })
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const userIds = res.body.data.map((assignment: { user: { id: number } }) => assignment.user.id);
      expect(userIds).toContain(ownMember.id);
      expect(userIds).not.toContain(otherMember.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /api/roles/assign
  // ═══════════════════════════════════════════════════════════════════════

  describe("POST /api/roles/assign", () => {
    // ─── HOD Assignment ──────────────────────────────────────────────

    it("should allow admin to assign HOD → department.hodId updated", async () => {
      const admin = await createUser({
        email: `admin-hod-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-HOD-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-hod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("hod");
      expect(res.body.data.userId).toBe(teacher.id);
      expect(res.body.data.departmentId).toBe(dept.id);
      expect(res.body.message).toBe("Role assigned successfully");

      // Verify DB
      const updated = await prisma.department.findUnique({ where: { id: dept.id } });
      expect(updated!.hodId).toBe(teacher.id);
    });

    it("should return 409 when assigning second HOD to same department", async () => {
      const admin = await createUser({
        email: `admin-hod2-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-HOD2-${uid()}` });
      const teacher1 = await createTeacherWithInfo(dept.id, {
        email: `t-hod2a-${uid()}@test.com`,
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t-hod2b-${uid()}@test.com`,
        password: "Pass@1234",
      });

      await assignHOD(dept.id, teacher1.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher2.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject assigning HOD to non-teacher", async () => {
      const admin = await createUser({
        email: `admin-hod-nt-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-HODNT-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-hod-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject assigning HOD to teacher from different department", async () => {
      const admin = await createUser({
        email: `admin-hod-dd-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: `D-HODDD1-${uid()}` });
      const dept2 = await createDepartment({ code: `D-HODDD2-${uid()}` });
      const teacher = await createTeacherWithInfo(dept2.id, {
        email: `t-hoddd-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "hod", scopeId: dept1.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // ─── CR Assignment ───────────────────────────────────────────────

    it("should allow admin to assign CR → class.crId updated", async () => {
      const admin = await createUser({
        email: `admin-cr-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-CR-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-cr-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("cr");
      expect(res.body.data.userId).toBe(student.id);
      expect(res.body.data.classId).toBe(cls.id);

      // Verify DB
      const updated = await prisma.class.findUnique({ where: { id: cls.id } });
      expect(updated!.crId).toBe(student.id);
    });

    it("should allow HOD to assign CR within their department", async () => {
      const dept = await createDepartment({ code: `D-HODCR-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cr-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: hod.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-hodcr-${uid()}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("cr");
    });

    it("should return 403 when HOD assigns CR outside their department", async () => {
      const dept1 = await createDepartment({ code: `D-HODCR1-${uid()}` });
      const dept2 = await createDepartment({ code: `D-HODCR2-${uid()}` });
      const hod = await createTeacherWithInfo(dept1.id, {
        email: `hod-crout-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept1.id, hod.id);

      const program2 = await createProgram(dept2.id);
      const cls2 = await createClass(program2.id);
      const student = await createStudentWithInfo(cls2.id, dept2.id, {
        email: `s-crout-${uid()}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls2.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow PD to assign CR within their program", async () => {
      const dept = await createDepartment({ code: `D-PDCR-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-cr-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const program = await createProgram(dept.id);
      await assignPD(program.id, pd.id);

      const cls = await createClass(program.id, { creatorId: pd.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-pdcr-${uid()}@test.com`,
      });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("cr");
    });

    it("should return 403 when PD assigns CR outside their program", async () => {
      const dept = await createDepartment({ code: `D-PDCROUT-${uid()}` });
      const pd = await createTeacherWithInfo(dept.id, {
        email: `pd-crout-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const program1 = await createProgram(dept.id);
      const program2 = await createProgram(dept.id);
      await assignPD(program1.id, pd.id);

      const cls2 = await createClass(program2.id);
      const student = await createStudentWithInfo(cls2.id, dept.id, {
        email: `s-pdcrout-${uid()}@test.com`,
      });
      const cookies = await loginAs(pd.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls2.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 when assigning second CR to same class", async () => {
      const admin = await createUser({
        email: `admin-cr2-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-CR2-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-cr2a-${uid()}@test.com`,
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-cr2b-${uid()}@test.com`,
      });

      await assignCR(cls.id, student1.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student2.id, role: "cr", scopeId: cls.id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject assigning CR to student from different class", async () => {
      const admin = await createUser({
        email: `admin-cr-dc-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-CRDC-${uid()}` });
      const program = await createProgram(dept.id);
      const cls1 = await createClass(program.id, { creatorId: admin.id, section: "A" });
      const cls2 = await createClass(program.id, { creatorId: admin.id, section: "B" });
      const student = await createStudentWithInfo(cls2.id, dept.id, {
        email: `s-crdc-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls1.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // ─── Program Director Assignment ─────────────────────────────────

    it("should allow admin to assign Program Director", async () => {
      const admin = await createUser({
        email: `admin-pd-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-PD-${uid()}` });
      const program = await createProgram(dept.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-pd-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "program_director", scopeId: program.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("program_director");
      expect(res.body.data.userId).toBe(teacher.id);
      expect(res.body.data.programId).toBe(program.id);

      // Verify DB
      const updated = await prisma.program.findUnique({ where: { id: program.id } });
      expect(updated!.programDirectorId).toBe(teacher.id);
    });

    // ─── Moderator Assignment ────────────────────────────────────────

    it("should allow admin to assign server moderator", async () => {
      const admin = await createUser({
        email: `admin-mod-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-MOD-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-mod-${uid()}@test.com`,
      });
      const deptRecord = await prisma.department.findUnique({
        where: { id: dept.id },
        select: { serverId: true },
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "server_moderator", serverId: deptRecord!.serverId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("server_moderator");
      expect(res.body.data.scopeType).toBe("server");
      expect(res.body.data.serverId).toBe(deptRecord!.serverId);

      // Verify DB
      const assignment = await prisma.moderatorAssignment.findFirst({
        where: { userId: teacher.id, serverId: deptRecord!.serverId },
      });
      expect(assignment).not.toBeNull();
      expect(assignment!.scopeType).toBe("SERVER");
    });

    it("should allow admin to assign channel moderator", async () => {
      const admin = await createUser({
        email: `admin-modch-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-MODCH-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-modch-${uid()}@test.com`,
      });
      const deptRecord = await prisma.department.findUnique({
        where: { id: dept.id },
        select: { serverId: true },
      });
      // Create a channel in the department server for channel-scoped test
      const channel = await prisma.channel.create({
        data: {
          serverId: deptRecord!.serverId,
          name: `announcements-${uid()}`,
          type: "ANNOUNCEMENT",
          isAutoCreated: true,
          createdBy: admin.id,
        },
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: teacher.id,
          role: "channel_moderator",
          serverId: deptRecord!.serverId,
          channelId: channel.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("channel_moderator");
      expect(res.body.data.scopeType).toBe("channel");
      expect(res.body.data.channelId).toBe(channel.id);
    });

    it("should allow CR to assign server moderator in their class server", async () => {
      const dept = await createDepartment({ code: `D-CRMOD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const crStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-mod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignCR(cls.id, crStudent.id);

      const otherStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-crmod-${uid()}@test.com`,
      });
      const classRecord = await prisma.class.findUnique({
        where: { id: cls.id },
        select: { serverId: true },
      });
      const cookies = await loginAs(crStudent.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: otherStudent.id,
          role: "server_moderator",
          serverId: classRecord!.serverId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("server_moderator");
    });

    it("should return 403 when CR assigns server moderator in another server", async () => {
      const dept = await createDepartment({ code: `D-CRMOD2-${uid()}` });
      const program = await createProgram(dept.id);
      const cls1 = await createClass(program.id, { section: "A" });
      const cls2 = await createClass(program.id, { section: "B" });
      const crStudent = await createStudentWithInfo(cls1.id, dept.id, {
        email: `cr-mod2-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignCR(cls1.id, crStudent.id);

      const otherStudent = await createStudentWithInfo(cls2.id, dept.id, {
        email: `s-crmod2-${uid()}@test.com`,
      });
      const cls2Record = await prisma.class.findUnique({
        where: { id: cls2.id },
        select: { serverId: true },
      });
      const cookies = await loginAs(crStudent.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: otherStudent.id,
          role: "server_moderator",
          serverId: cls2Record!.serverId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow convenor to assign server moderator in their society server", async () => {
      const dept = await createDepartment({ code: `D-CMOD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-cmod-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-cmod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Soc-CMOD-${uid()}`,
      });

      // Add a member to the society server
      const member = await createStudentWithInfo(cls.id, dept.id, {
        email: `mem-cmod-${uid()}@test.com`,
      });
      await addServerMembership(member.id, society.serverId);

      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: member.id,
          role: "server_moderator",
          serverId: society.serverId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("server_moderator");
    });

    it("should allow president to assign server moderator in their society server", async () => {
      const dept = await createDepartment({ code: `D-PMOD-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-pmod-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-pmod-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Soc-PMOD-${uid()}`,
      });

      // Add a member to the society server
      const member = await createStudentWithInfo(cls.id, dept.id, {
        email: `mem-pmod-${uid()}@test.com`,
      });
      await addServerMembership(member.id, society.serverId);

      const cookies = await loginAs(president.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: member.id,
          role: "server_moderator",
          serverId: society.serverId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("server_moderator");
    });

    it("should return 409 when assigning duplicate server moderator", async () => {
      const admin = await createUser({
        email: `admin-moddup-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-MODDUP-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-moddup-${uid()}@test.com`,
      });
      const deptRecord = await prisma.department.findUnique({
        where: { id: dept.id },
        select: { serverId: true },
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      // First assignment
      await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "server_moderator", serverId: deptRecord!.serverId });

      // Duplicate assignment
      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "server_moderator", serverId: deptRecord!.serverId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject server moderator assignment when user is not a server member", async () => {
      const admin = await createUser({
        email: `admin-modnm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-MODNM-${uid()}` });
      const dept2 = await createDepartment({ code: `D-MODNM2-${uid()}` });
      // Teacher from dept2 is NOT a member of dept1's server
      const teacher = await createTeacherWithInfo(dept2.id, {
        email: `t-modnm-${uid()}@test.com`,
      });
      const deptRecord = await prisma.department.findUnique({
        where: { id: dept.id },
        select: { serverId: true },
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "server_moderator", serverId: deptRecord!.serverId });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // ─── Society President / Convenor Assignment ─────────────────────

    it("should reject society president assignment through generic role API", async () => {
      const admin = await createUser({
        email: `admin-sp-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-SP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-sp-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-sp-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Soc-SP-${uid()}`,
      });

      // New president (must be a member)
      const newPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `newpres-sp-${uid()}@test.com`,
      });
      await addServerMembership(newPresident.id, society.serverId);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: newPresident.id, role: "society_president", scopeId: society.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error.details)).toContain("PATCH /api/societies/:id");

      // Verify DB
      const updated = await prisma.society.findUnique({ where: { id: society.id } });
      expect(updated!.presidentId).toBe(president.id);
    });

    it("should reject society convenor assignment through generic role API", async () => {
      const admin = await createUser({
        email: `admin-sc-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-SC-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const president = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-sc-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-sc-${uid()}@test.com`,
      });
      const { society } = await createSociety(dept.id, president.id, convenor.id, {
        name: `Soc-SC-${uid()}`,
      });

      const newConvenor = await createTeacherWithInfo(dept.id, {
        email: `newconv-sc-${uid()}@test.com`,
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: newConvenor.id, role: "society_convenor", scopeId: society.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error.details)).toContain("PATCH /api/societies/:id");

      // Verify DB
      const updated = await prisma.society.findUnique({ where: { id: society.id } });
      expect(updated!.convenorId).toBe(convenor.id);
    });

    it("should reject convenor society president assignment through generic role API", async () => {
      const dept = await createDepartment({ code: `D-CSP-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const currentPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-csp-${uid()}@test.com`,
      });
      const convenor = await createTeacherWithInfo(dept.id, {
        email: `conv-csp-${uid()}@test.com`,
        password: "Pass@1234",
      });

      const { society } = await createSociety(dept.id, currentPresident.id, convenor.id, {
        name: `Soc-CSP-${uid()}`,
      });

      const newPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `newpres-csp-${uid()}@test.com`,
      });
      await addServerMembership(newPresident.id, society.serverId);

      const cookies = await loginAs(convenor.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: newPresident.id, role: "society_president", scopeId: society.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error.details)).toContain("PATCH /api/societies/:id");

      const updated = await prisma.society.findUnique({ where: { id: society.id } });
      expect(updated!.presidentId).toBe(currentPresident.id);
    });

    it("should reject out-of-scope society president assignment before authorization", async () => {
      const dept = await createDepartment({ code: `D-CSP2-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const presidentA = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-csp2a-${uid()}@test.com`,
      });
      const convenorA = await createTeacherWithInfo(dept.id, {
        email: `conv-csp2a-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await createSociety(dept.id, presidentA.id, convenorA.id, {
        name: `Soc-CSP2A-${uid()}`,
      });

      const presidentB = await createStudentWithInfo(cls.id, dept.id, {
        email: `pres-csp2b-${uid()}@test.com`,
      });
      const convenorB = await createTeacherWithInfo(dept.id, {
        email: `conv-csp2b-${uid()}@test.com`,
      });
      const { society: societyB } = await createSociety(dept.id, presidentB.id, convenorB.id, {
        name: `Soc-CSP2B-${uid()}`,
      });

      const replacementPresident = await createStudentWithInfo(cls.id, dept.id, {
        email: `newpres-csp2-${uid()}@test.com`,
      });
      await addServerMembership(replacementPresident.id, societyB.serverId);

      const cookies = await loginAs(convenorA.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: replacementPresident.id, role: "society_president", scopeId: societyB.id });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body.error.details)).toContain("PATCH /api/societies/:id");
    });

    it("should accept numeric IDs sent as strings", async () => {
      const admin = await createUser({
        email: `admin-coerce-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-COERCE-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-coerce-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({
          userId: String(teacher.id),
          role: "hod",
          scopeId: String(dept.id),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ─── Unauthenticated ────────────────────────────────────────────

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app)
        .post("/api/roles/assign")
        .send({ userId: 1, role: "hod", scopeId: 1 });

      expect(res.status).toBe(401);
    });

    // ─── Non-authorized user ────────────────────────────────────────

    it("should return 403 when regular teacher tries to assign a role", async () => {
      const dept = await createDepartment({ code: `D-NOAUTH-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-noauth-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t-noauth2-${uid()}@test.com`,
      });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher2.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // POST /api/roles/revoke
  // ═══════════════════════════════════════════════════════════════════════

  describe("POST /api/roles/revoke", () => {
    it("should revoke HOD → department.hodId nulled", async () => {
      const admin = await createUser({
        email: `admin-rhod-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-RHOD-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-rhod-${uid()}@test.com`,
      });
      await assignHOD(dept.id, teacher.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("hod");
      expect(res.body.message).toBe("Role revoked successfully");

      // Verify DB
      const updated = await prisma.department.findUnique({ where: { id: dept.id } });
      expect(updated!.hodId).toBeNull();
    });

    it("should revoke CR → class.crId nulled", async () => {
      const admin = await createUser({
        email: `admin-rcr-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-RCR-${uid()}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id, { creatorId: admin.id });
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `s-rcr-${uid()}@test.com`,
      });
      await assignCR(cls.id, student.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: student.id, role: "cr", scopeId: cls.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("cr");

      // Verify DB
      const updated = await prisma.class.findUnique({ where: { id: cls.id } });
      expect(updated!.crId).toBeNull();
    });

    it("should revoke Program Director → programDirectorId nulled", async () => {
      const admin = await createUser({
        email: `admin-rpd-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-RPD-${uid()}` });
      const program = await createProgram(dept.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-rpd-${uid()}@test.com`,
      });
      await assignPD(program.id, teacher.id);
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "program_director", scopeId: program.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("program_director");

      // Verify DB
      const updated = await prisma.program.findUnique({ where: { id: program.id } });
      expect(updated!.programDirectorId).toBeNull();
    });

    it("should revoke server moderator → assignment deleted", async () => {
      const admin = await createUser({
        email: `admin-rmod-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-RMOD-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-rmod-${uid()}@test.com`,
      });
      const deptRecord = await prisma.department.findUnique({
        where: { id: dept.id },
        select: { serverId: true },
      });

      // Create moderator assignment
      await prisma.moderatorAssignment.create({
        data: {
          userId: teacher.id,
          scopeType: "SERVER",
          serverId: deptRecord!.serverId,
          assignedBy: admin.id,
        },
      });

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "server_moderator", serverId: deptRecord!.serverId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("server_moderator");

      // Verify DB
      const assignment = await prisma.moderatorAssignment.findFirst({
        where: { userId: teacher.id, serverId: deptRecord!.serverId },
      });
      expect(assignment).toBeNull();
    });

    it("should reject revoking society_president via schema validation", async () => {
      const admin = await createUser({
        email: `admin-rsp-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: 1, role: "society_president", scopeId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject revoking society_convenor via schema validation", async () => {
      const admin = await createUser({
        email: `admin-rsc-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: 1, role: "society_convenor", scopeId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 when revoking non-existent assignment", async () => {
      const admin = await createUser({
        email: `admin-rne-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-RNE-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-rne-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when non-authorized user tries to revoke", async () => {
      const dept = await createDepartment({ code: `D-RNOAUTH-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-rnoauth-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t-rnoauth2-${uid()}@test.com`,
      });
      await assignHOD(dept.id, teacher2.id);
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/revoke")
        .set("Cookie", cookies)
        .send({ userId: teacher2.id, role: "hod", scopeId: dept.id });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GET /api/roles/users/:id
  // ═══════════════════════════════════════════════════════════════════════

  describe("GET /api/roles/users/:id", () => {
    it("should return all roles for a user with multiple roles (admin)", async () => {
      const admin = await createUser({
        email: `admin-gr-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-GR-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-gr-${uid()}@test.com`,
      });
      const program = await createProgram(dept.id);
      await assignHOD(dept.id, teacher.id);
      await assignPD(program.id, teacher.id);

      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/roles/users/${teacher.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const roleNames = res.body.data.map((r: { role: string }) => r.role);
      expect(roleNames).toContain("hod");
      expect(roleNames).toContain("program_director");
    });

    it("should return empty array for user with no roles", async () => {
      const admin = await createUser({
        email: `admin-gr0-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-GR0-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-gr0-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/roles/users/${teacher.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should allow HOD to view roles for user in their department", async () => {
      const dept = await createDepartment({ code: `D-GRHOD-${uid()}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-gr-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t-grhod-${uid()}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/roles/users/${teacher2.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 403 when HOD views roles for user outside their department", async () => {
      const dept1 = await createDepartment({ code: `D-GRHODOUT1-${uid()}` });
      const dept2 = await createDepartment({ code: `D-GRHODOUT2-${uid()}` });
      const hod = await createTeacherWithInfo(dept1.id, {
        email: `hod-grout-${uid()}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept1.id, hod.id);

      const teacher2 = await createTeacherWithInfo(dept2.id, {
        email: `t-grhodout-${uid()}@test.com`,
      });
      const cookies = await loginAs(hod.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/roles/users/${teacher2.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when regular teacher tries to view roles", async () => {
      const dept = await createDepartment({ code: `D-GRNOT-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-grnot-${uid()}@test.com`,
        password: "Pass@1234",
      });
      const teacher2 = await createTeacherWithInfo(dept.id, {
        email: `t-grnot2-${uid()}@test.com`,
      });
      const cookies = await loginAs(teacher.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/roles/users/${teacher2.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      const admin = await createUser({
        email: `admin-gr404-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .get("/api/roles/users/999999")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Role changes are immediately effective (FR-63)
  // ═══════════════════════════════════════════════════════════════════════

  describe("Immediate effectiveness (FR-63)", () => {
    it("should reflect assigned role immediately in getUserRoles", async () => {
      const admin = await createUser({
        email: `admin-imm-${uid()}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `D-IMM-${uid()}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `t-imm-${uid()}@test.com`,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Assign HOD
      await request(app)
        .post("/api/roles/assign")
        .set("Cookie", cookies)
        .send({ userId: teacher.id, role: "hod", scopeId: dept.id });

      // Immediately query roles
      const res = await request(app)
        .get(`/api/roles/users/${teacher.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const roleNames = res.body.data.map((r: { role: string }) => r.role);
      expect(roleNames).toContain("hod");
    });
  });
});
