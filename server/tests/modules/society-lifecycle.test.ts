import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { cloudinaryService } from "../../src/config/cloudinary.js";
import { prisma } from "../../src/config/prisma.js";
import { createPost as createPostService } from "../../src/modules/post/post.service.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  addServerMembership,
  createChannel,
  createClass,
  createDepartment,
  createNotificationPreference,
  createPlatformRoleAssignment,
  createPost as createPostFixture,
  createProgram,
  createSociety,
  createSocietyMembershipRequest,
  createStudentWithInfo,
  createTeacherWithInfo,
  createUser,
  loginAs,
  apiId,
} from "../helpers/factory.js";

let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

async function createFixture() {
  const admin = await createUser({
    email: `lifecycle-admin-${uid()}@test.com`,
    password: "Pass@1234",
    userType: "ADMIN",
  });
  const department = await createDepartment({ code: `LIFE-${uid()}`, creatorId: admin.id });
  const program = await createProgram(department.id);
  const classRecord = await createClass(program.id, { creatorId: admin.id });
  const president = await createStudentWithInfo(classRecord.id, department.id, {
    email: `lifecycle-president-${uid()}@test.com`,
  });
  const convenor = await createTeacherWithInfo(department.id, {
    email: `lifecycle-convenor-${uid()}@test.com`,
  });
  const member = await createStudentWithInfo(classRecord.id, department.id, {
    email: `lifecycle-member-${uid()}@test.com`,
  });
  const applicant = await createStudentWithInfo(classRecord.id, department.id, {
    email: `lifecycle-applicant-${uid()}@test.com`,
    password: "Pass@1234",
  });
  const { society, server } = await createSociety(
    department.id,
    president.id,
    convenor.id,
    { name: `Lifecycle Society ${uid()}`, creatorId: admin.id },
  );
  await addServerMembership(member.id, server.id);
  await createSocietyMembershipRequest(society.id, applicant.id);
  const general = await prisma.channel.findFirstOrThrow({
    where: { serverId: server.id, name: "general" },
  });
  return {
    admin,
    department,
    program,
    classRecord,
    president,
    convenor,
    member,
    applicant,
    society,
    server,
    general,
    adminCookies: await loginAs(admin.email, "Pass@1234"),
  };
}

beforeEach(async () => {
  await resetDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 5 - Society Lifecycle and Notifications", () => {
  it("suspends and reactivates a society while preserving pending requests and freezing writes", async () => {
    const fixture = await createFixture();
    await addServerMembership(fixture.admin.id, fixture.server.id);

    const suspend = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/status`)
      .set("Cookie", fixture.adminCookies)
      .send({ status: "SUSPENDED", reason: "Review in progress" });

    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe("SUSPENDED");
    await expect(
      prisma.societyMembershipRequest.count({
        where: { societyId: fixture.society.id, status: "PENDING" },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.server.findUniqueOrThrow({ where: { id: fixture.server.id } }),
    ).resolves.toMatchObject({ isActive: false, isDeleted: false });

    const lifecycleNotices = await prisma.notification.findMany({
      where: { societyId: fixture.society.id, type: "SOCIETY_SUSPENDED" },
      select: { userId: true },
    });
    expect(lifecycleNotices.map((notification) => notification.userId)).not.toContain(
      fixture.admin.id,
    );
    expect(lifecycleNotices.map((notification) => notification.userId)).toEqual(
      expect.arrayContaining([fixture.president.id, fixture.convenor.id, fixture.member.id]),
    );

    const blockedChannel = await request(app)
      .post(`/api/servers/${apiId(fixture.server)}/channels`)
      .set("Cookie", fixture.adminCookies)
      .send({ name: "blocked-channel" });
    expect(blockedChannel.status).toBe(409);
    expect(blockedChannel.body.error.code).toBe("SOCIETY_SUSPENDED");

    const blockedPost = await request(app)
      .post(`/api/channels/${apiId(fixture.general)}/posts`)
      .set("Cookie", fixture.adminCookies)
      .send({ title: "Blocked", content: "This write must not pass." });
    expect(blockedPost.status).toBe(409);
    expect(blockedPost.body.error.code).toBe("SOCIETY_SUSPENDED");

    const activate = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/status`)
      .set("Cookie", fixture.adminCookies)
      .send({ status: "ACTIVE" });
    expect(activate.status).toBe(200);
    await expect(
      prisma.server.findUniqueOrThrow({ where: { id: fixture.server.id } }),
    ).resolves.toMatchObject({ isActive: true, isDeleted: false });
  });

  it("soft-deletes and restores only descendants tagged by the same cascade", async () => {
    const fixture = await createFixture();
    const liveChannel = await createChannel(fixture.server.id, {
      name: "live-before-delete",
      createdBy: fixture.admin.id,
    });
    const previouslyDeletedChannel = await createChannel(fixture.server.id, {
      name: "standalone-deleted",
      createdBy: fixture.admin.id,
    });
    await prisma.channel.update({
      where: { id: previouslyDeletedChannel.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: fixture.admin.id },
    });
    const post = await createPostFixture(liveChannel.id, fixture.member.id);
    const assignment = await createPlatformRoleAssignment({
      userId: fixture.member.id,
      role: "server_moderator",
      serverId: fixture.server.id,
      assignedBy: fixture.admin.id,
    });
    const preference = await createNotificationPreference(fixture.member.id, fixture.server.id);

    const deleted = await request(app)
      .delete(`/api/societies/${fixture.society.publicId}`)
      .set("Cookie", fixture.adminCookies)
      .send({ reason: "Annual cleanup" });
    expect(deleted.status).toBe(200);

    const deletedSociety = await prisma.society.findUniqueOrThrow({
      where: { id: fixture.society.id },
    });
    const deletedServer = await prisma.server.findUniqueOrThrow({
      where: { id: fixture.server.id },
    });
    expect(deletedSociety.deletedCascadeId).toBeTruthy();
    expect(deletedServer.deletedCascadeId).toBe(deletedSociety.deletedCascadeId);
    await expect(
      prisma.channel.findUniqueOrThrow({ where: { id: liveChannel.id } }),
    ).resolves.toMatchObject({ isDeleted: true, deletedCascadeId: deletedSociety.deletedCascadeId });
    await expect(
      prisma.channel.findUniqueOrThrow({ where: { id: previouslyDeletedChannel.id } }),
    ).resolves.toMatchObject({ isDeleted: true, deletedCascadeId: null });
    await expect(prisma.post.findUnique({ where: { id: post.id } })).resolves.not.toBeNull();
    await expect(
      prisma.societyMembershipRequest.count({
        where: { societyId: fixture.society.id, status: "PENDING" },
      }),
    ).resolves.toBe(0);
    await expect(prisma.userRoleAssignment.findUnique({ where: { id: assignment.id } })).resolves.not.toBeNull();
    await expect(prisma.notificationPreference.findUnique({ where: { id: preference.id } })).resolves.not.toBeNull();
    await expect(
      prisma.serverMembership.count({ where: { serverId: fixture.server.id } }),
    ).resolves.toBe(3);

    const restored = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/restore`)
      .set("Cookie", fixture.adminCookies)
      .send({ reason: "Approved for return" });
    expect(restored.status).toBe(200);
    expect(restored.body.data.status).toBe("ACTIVE");
    await expect(
      prisma.channel.findUniqueOrThrow({ where: { id: liveChannel.id } }),
    ).resolves.toMatchObject({ isDeleted: false, deletedCascadeId: null });
    await expect(
      prisma.channel.findUniqueOrThrow({ where: { id: previouslyDeletedChannel.id } }),
    ).resolves.toMatchObject({ isDeleted: true, deletedCascadeId: null });
  });

  it("allows own-department HOD lifecycle actions and rejects unrelated HODs", async () => {
    const fixture = await createFixture();
    const ownHod = await createTeacherWithInfo(fixture.department.id, {
      email: `lifecycle-own-hod-${uid()}@test.com`,
      password: "Pass@1234",
    });
    await prisma.department.update({
      where: { id: fixture.department.id },
      data: { hodId: ownHod.id },
    });
    const otherDepartment = await createDepartment({ code: `OTHER-${uid()}` });
    const otherHod = await createTeacherWithInfo(otherDepartment.id, {
      email: `lifecycle-other-hod-${uid()}@test.com`,
      password: "Pass@1234",
    });
    await prisma.department.update({
      where: { id: otherDepartment.id },
      data: { hodId: otherHod.id },
    });

    const forbidden = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/status`)
      .set("Cookie", await loginAs(otherHod.email, "Pass@1234"))
      .send({ status: "SUSPENDED" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/status`)
      .set("Cookie", await loginAs(ownHod.email, "Pass@1234"))
      .send({ status: "SUSPENDED" });
    expect(allowed.status).toBe(200);
  });

  it("cleans uploaded attachments when a society is suspended before post persistence", async () => {
    const fixture = await createFixture();
    const deleteImage = jest
      .spyOn(cloudinaryService, "deleteImage")
      .mockResolvedValue();
    jest
      .spyOn(cloudinaryService, "uploadImage")
      .mockImplementation(async () => {
        await prisma.society.update({
          where: { id: fixture.society.id },
          data: { status: "SUSPENDED", isActive: false },
        });
        await prisma.server.update({
          where: { id: fixture.server.id },
          data: { isActive: false },
        });
        return {
          url: "https://cloudinary.com/post-attachments/race.jpg",
          publicId: "post-attachments/race",
        };
      });

    await expect(
      createPostService(
        fixture.general.id,
        { title: "Race", content: "Must not persist." },
        [{ buffer: Buffer.from("image"), mimetype: "image/jpeg", size: 5 }],
        { id: fixture.admin.id, userType: "ADMIN" },
      ),
    ).rejects.toMatchObject({ code: "SOCIETY_SUSPENDED" });

    expect(deleteImage).toHaveBeenCalledWith("post-attachments/race");
    await expect(
      prisma.post.count({ where: { title: "Race" } }),
    ).resolves.toBe(0);
  });

  it("rejects restore when a deleted society name has been reused", async () => {
    const fixture = await createFixture();
    await request(app)
      .delete(`/api/societies/${fixture.society.publicId}`)
      .set("Cookie", fixture.adminCookies);
    const newPresident = await createStudentWithInfo(fixture.classRecord.id, fixture.department.id, {
      email: `lifecycle-new-president-${uid()}@test.com`,
    });
    const newConvenor = await createTeacherWithInfo(fixture.department.id, {
      email: `lifecycle-new-convenor-${uid()}@test.com`,
    });
    await createSociety(fixture.department.id, newPresident.id, newConvenor.id, {
      name: fixture.society.name,
      creatorId: fixture.admin.id,
    });

    const restore = await request(app)
      .patch(`/api/societies/${fixture.society.publicId}/restore`)
      .set("Cookie", fixture.adminCookies);
    expect(restore.status).toBe(409);
    expect(restore.body.error.code).toBe("DUPLICATE_SOCIETY_NAME");
  });

  it("enforces null-safe notification preference uniqueness and channel ownership", async () => {
    const fixture = await createFixture();
    await createNotificationPreference(fixture.member.id, fixture.server.id);
    await expect(
      createNotificationPreference(fixture.member.id, fixture.server.id),
    ).rejects.toThrow();

    const otherDepartment = await createDepartment({ code: `PREF-${uid()}` });
    const foreignChannel = await createChannel(otherDepartment.serverId, {
      name: "foreign-channel",
    });
    await expect(
      createNotificationPreference(fixture.member.id, fixture.server.id, {
        scopeType: "CHANNEL",
        channelId: foreignChannel.id,
      }),
    ).rejects.toThrow();
  });
});
