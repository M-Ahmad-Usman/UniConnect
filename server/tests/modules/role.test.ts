import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  addServerMembership,
  assignHOD,
  createChannel,
  createClass,
  createDepartment,
  createPlatformRoleAssignment,
  createProgram,
  createStudentWithInfo,
  createTeacherWithInfo,
  createUser,
  loginAs,
  seedRolesAndPermissions,
} from "../helpers/factory.js";

let sequence = 0;
function uid(): string {
  sequence += 1;
  return sequence.toString(36);
}

async function createAdminSession() {
  const suffix = uid();
  const admin = await createUser({
    email: `role-admin-${suffix}@test.com`,
    password: "Pass@1234",
    userType: "ADMIN",
  });
  return { admin, cookies: await loginAs(admin.email, "Pass@1234") };
}

async function createPlatformFixture() {
  const suffix = uid();
  const { admin, cookies } = await createAdminSession();
  const department = await createDepartment({ code: `RBAC-${suffix}`, creatorId: admin.id });
  const program = await createProgram(department.id, { code: `PR-${suffix}` });
  const klass = await createClass(program.id, { creatorId: admin.id });
  const student = await createStudentWithInfo(klass.id, department.id, {
    email: `role-student-${suffix}@test.com`,
    password: "Pass@1234",
  });
  const server = await prisma.server.findUniqueOrThrow({ where: { id: department.serverId } });
  const channel = await createChannel(server.id, { name: `role-channel-${suffix}` });
  return { admin, cookies, department, program, klass, student, server, channel };
}

beforeAll(async () => {
  await resetDB();
  await seedRolesAndPermissions();
});

describe("Module 4 - Platform RBAC", () => {
  it("uses canonical owner endpoints for academic assignments", async () => {
    const suffix = uid();
    const { cookies } = await createAdminSession();
    const department = await createDepartment({ code: `OWN-${suffix}` });
    const program = await createProgram(department.id, { code: `OWN-P-${suffix}` });
    const klass = await createClass(program.id);
    const teacher = await createTeacherWithInfo(department.id, {
      email: `owner-teacher-${suffix}@test.com`,
    });
    const student = await createStudentWithInfo(klass.id, department.id, {
      email: `owner-student-${suffix}@test.com`,
    });

    expect(
      (
        await request(app)
          .put(`/api/departments/${department.id}/hod`)
          .set("Cookie", cookies)
          .send({ userPublicId: teacher.publicId })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .put(`/api/programs/${program.id}/program-director`)
          .set("Cookie", cookies)
          .send({ userPublicId: teacher.publicId })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .put(`/api/classes/${klass.publicId}/cr`)
          .set("Cookie", cookies)
          .send({ userPublicId: student.publicId })
      ).status,
    ).toBe(200);

    expect((await prisma.department.findUniqueOrThrow({ where: { id: department.id } })).hodId).toBe(
      teacher.id,
    );
    expect((await prisma.program.findUniqueOrThrow({ where: { id: program.id } })).programDirectorId).toBe(
      teacher.id,
    );
    expect((await prisma.class.findUniqueOrThrow({ where: { id: klass.id } })).crId).toBe(student.id);

    expect(
      (await request(app).delete(`/api/classes/${klass.publicId}/cr`).set("Cookie", cookies)).status,
    ).toBe(200);
    expect((await prisma.class.findUniqueOrThrow({ where: { id: klass.id } })).crId).toBeNull();
  });

  it("removes the legacy generic role mutation routes", async () => {
    const { cookies } = await createAdminSession();
    expect((await request(app).post("/api/roles/assign").set("Cookie", cookies).send({})).status).toBe(
      404,
    );
    expect((await request(app).post("/api/roles/revoke").set("Cookie", cookies).send({})).status).toBe(
      404,
    );
  });

  it("creates, revokes, and reassigns append-only platform role periods", async () => {
    const fixture = await createPlatformFixture();
    const payload = {
      userPublicId: fixture.student.publicId,
      role: "server_moderator",
      serverPublicId: fixture.server.publicId,
    };
    const created = await request(app)
      .post("/api/roles/platform-assignments")
      .set("Cookie", fixture.cookies)
      .send(payload);

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      assignmentPublicId: expect.any(String),
      role: "server_moderator",
      scopeType: "server",
      expiresAt: null,
      state: "ACTIVE",
      user: { publicId: fixture.student.publicId },
      server: { publicId: fixture.server.publicId },
    });
    expect(
      (
        await request(app)
          .post("/api/roles/platform-assignments")
          .set("Cookie", fixture.cookies)
          .send(payload)
      ).status,
    ).toBe(409);

    const assignmentPublicId = created.body.data.assignmentPublicId as string;
    const revoked = await request(app)
      .delete(`/api/roles/platform-assignments/${assignmentPublicId}`)
      .set("Cookie", fixture.cookies);
    expect(revoked.status).toBe(200);
    expect(revoked.body.data.state).toBe("REVOKED");
    expect(
      (await prisma.userRoleAssignment.findUniqueOrThrow({ where: { publicId: assignmentPublicId } }))
        .revokedAt,
    ).not.toBeNull();

    expect(
      (
        await request(app)
          .post("/api/roles/platform-assignments")
          .set("Cookie", fixture.cookies)
          .send(payload)
      ).status,
    ).toBe(201);
    expect(await prisma.userRoleAssignment.count({ where: { userId: fixture.student.id } })).toBe(2);
  });

  it("supports channel scope, expiry edits, and admin history", async () => {
    const fixture = await createPlatformFixture();
    const initialExpiry = new Date(Date.now() + 60_000).toISOString();
    const created = await request(app)
      .post("/api/roles/platform-assignments")
      .set("Cookie", fixture.cookies)
      .send({
        userPublicId: fixture.student.publicId,
        role: "channel_moderator",
        serverPublicId: fixture.server.publicId,
        channelPublicId: fixture.channel.publicId,
        expiresAt: initialExpiry,
      });
    expect(created.status).toBe(201);
    const assignmentPublicId = created.body.data.assignmentPublicId as string;

    const updated = await request(app)
      .patch(`/api/roles/platform-assignments/${assignmentPublicId}/expiry`)
      .set("Cookie", fixture.cookies)
      .send({ expiresAt: null });
    expect(updated.status).toBe(200);
    expect(updated.body.data.expiresAt).toBeNull();

    expect(
      (
        await request(app)
          .patch(`/api/roles/platform-assignments/${assignmentPublicId}/expiry`)
          .set("Cookie", fixture.cookies)
          .send({ expiresAt: new Date(Date.now() - 60_000).toISOString() })
      ).status,
    ).toBe(400);

    const history = await request(app)
      .get("/api/roles/platform-assignments/history")
      .query({ channelPublicId: fixture.channel.publicId })
      .set("Cookie", fixture.cookies);
    expect(history.status).toBe(200);
    expect(history.body.data[0]).toMatchObject({
      assignmentPublicId,
      channel: { publicId: fixture.channel.publicId },
      state: "ACTIVE",
    });
  });

  it("rejects overlapping concurrent inserts at the database boundary", async () => {
    const fixture = await createPlatformFixture();
    const payload = {
      userPublicId: fixture.student.publicId,
      role: "server_moderator",
      serverPublicId: fixture.server.publicId,
    };
    const responses = await Promise.all([
      request(app).post("/api/roles/platform-assignments").set("Cookie", fixture.cookies).send(payload),
      request(app).post("/api/roles/platform-assignments").set("Cookie", fixture.cookies).send(payload),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it("excludes expired assignments from authorization readers", async () => {
    const fixture = await createPlatformFixture();
    const assignedAt = new Date(Date.now() - 120_000);
    await createPlatformRoleAssignment({
      userId: fixture.student.id,
      role: "channel_moderator",
      serverId: fixture.server.id,
      channelId: fixture.channel.id,
      assignedBy: fixture.admin.id,
      assignedAt,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const studentCookies = await loginAs(fixture.student.email, "Pass@1234");
    const profile = await request(app).get("/api/users/me").set("Cookie", studentCookies);
    expect(profile.status).toBe(200);
    expect(profile.body.data.roles).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ role: "channel_moderator" })]),
    );
  });

  it("filters admin users from moderator candidate lists", async () => {
    const fixture = await createPlatformFixture();
    const adminTarget = await createUser({
      email: `role-admin-target-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    await addServerMembership(adminTarget.id, fixture.server.id);

    const response = await request(app)
      .get("/api/roles/assignable-users")
      .query({ role: "server_moderator", serverPublicId: fixture.server.publicId })
      .set("Cookie", fixture.cookies);

    expect(response.status).toBe(200);
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ publicId: adminTarget.publicId })]),
    );
  });

  it("rejects admin moderator assignments", async () => {
    const fixture = await createPlatformFixture();
    const adminTarget = await createUser({
      email: `role-admin-assign-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    await addServerMembership(adminTarget.id, fixture.server.id);

    const response = await request(app)
      .post("/api/roles/platform-assignments")
      .set("Cookie", fixture.cookies)
      .send({
        userPublicId: adminTarget.publicId,
        role: "server_moderator",
        serverPublicId: fixture.server.publicId,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("allows an HOD to manage moderators only in their live department scope", async () => {
    const suffix = uid();
    const first = await createDepartment({ code: `HOD-A-${suffix}` });
    const second = await createDepartment({ code: `HOD-B-${suffix}` });
    const hod = await createTeacherWithInfo(first.id, {
      email: `role-hod-${suffix}@test.com`,
      password: "Pass@1234",
    });
    await assignHOD(first.id, hod.id);
    const target = await createTeacherWithInfo(first.id, {
      email: `role-target-${suffix}@test.com`,
    });
    await addServerMembership(target.id, second.serverId);
    const cookies = await loginAs(hod.email, "Pass@1234");
    const [firstServer, secondServer] = await Promise.all([
      prisma.server.findUniqueOrThrow({ where: { id: first.serverId } }),
      prisma.server.findUniqueOrThrow({ where: { id: second.serverId } }),
    ]);

    expect(
      (
        await request(app)
          .post("/api/roles/platform-assignments")
          .set("Cookie", cookies)
          .send({
            userPublicId: target.publicId,
            role: "server_moderator",
            serverPublicId: firstServer.publicId,
          })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .post("/api/roles/platform-assignments")
          .set("Cookie", cookies)
          .send({
            userPublicId: target.publicId,
            role: "server_moderator",
            serverPublicId: secondServer.publicId,
          })
      ).status,
    ).toBe(403);
  });
});
