import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createAdmin,
  createChannel,
  createClass,
  createDepartment,
  createPost,
  createProgram,
  createServer,
  createSociety,
  createStudentWithInfo,
  createTeacherWithInfo,
  createUser,
  loginAs,
} from "../helpers/factory.js";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(async () => {
  await resetDB();
});

describe("Module 1 - Schema Foundation", () => {
  it("generates public UUIDv7 IDs and default lifecycle state for core entities", async () => {
    const admin = await createAdmin({ email: "schema-admin@test.com" });
    const department = await createDepartment({ code: "SCF-1", creatorId: admin.id });
    const program = await createProgram(department.id, { code: "SCF-P1" });
    const classRecord = await createClass(program.id, { creatorId: admin.id });
    const teacher = await createTeacherWithInfo(department.id, {
      email: "schema-teacher@test.com",
    });
    const student = await createStudentWithInfo(classRecord.id, department.id, {
      email: "schema-student@test.com",
    });
    const { society, server } = await createSociety(
      department.id,
      student.id,
      teacher.id,
      { name: "Schema Society", creatorId: admin.id },
    );
    const channel = await createChannel(server.id, {
      name: "schema-feed",
      createdBy: admin.id,
    });
    const post = await createPost(channel.id, student.id);

    expect(admin.publicId).toMatch(UUID_V7_REGEX);
    expect(classRecord.publicId).toMatch(UUID_V7_REGEX);
    expect(society.publicId).toMatch(UUID_V7_REGEX);
    expect(server.publicId).toMatch(UUID_V7_REGEX);
    expect(channel.publicId).toMatch(UUID_V7_REGEX);
    expect(post.publicId).toMatch(UUID_V7_REGEX);

    expect(admin.status).toBe("ACTIVE");
    expect(admin.isActive).toBe(true);
    expect(admin.isDeleted).toBe(false);
    expect(society.status).toBe("ACTIVE");
    expect(society.isActive).toBe(true);
    expect(society.isDeleted).toBe(false);
    expect(server.isDeleted).toBe(false);
  });

  it("dual-writes existing user activation endpoints to UserStatus", async () => {
    const admin = await createUser({
      email: "schema-status-admin@test.com",
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const target = await createUser({
      email: "schema-status-target@test.com",
      password: "Pass@1234",
    });
    const cookies = await loginAs(admin.email, "Pass@1234");

    const deactivateRes = await request(app)
      .patch(`/api/users/${target.id}/deactivate`)
      .set("Cookie", cookies);

    expect(deactivateRes.status).toBe(200);
    const deactivated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(deactivated.isActive).toBe(false);
    expect(deactivated.status).toBe("SUSPENDED");

    const reactivateRes = await request(app)
      .patch(`/api/users/${target.id}/reactivate`)
      .set("Cookie", cookies);

    expect(reactivateRes.status).toBe(200);
    const reactivated = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(reactivated.isActive).toBe(true);
    expect(reactivated.status).toBe("ACTIVE");
  });

  it("allows email reuse only after user soft-delete", async () => {
    const email = "schema-reuse@test.com";
    const original = await createUser({ email });

    await expect(createUser({ email })).rejects.toThrow();

    await prisma.user.update({
      where: { id: original.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const replacement = await createUser({ email });
    expect(replacement.id).not.toBe(original.id);
    expect(replacement.email).toBe(email);
  });

  it("allows channel key reuse only after channel soft-delete", async () => {
    const admin = await createAdmin({ email: "schema-channel-admin@test.com" });
    const server = await createServer("DEPARTMENT", admin.id, {
      name: "Schema Channel Server",
    });
    const original = await createChannel(server.id, {
      name: "course-updates",
      createdBy: admin.id,
    });

    await expect(
      createChannel(server.id, { name: "course-updates", createdBy: admin.id }),
    ).rejects.toThrow();

    await prisma.channel.update({
      where: { id: original.id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: admin.id },
    });

    const replacement = await createChannel(server.id, {
      name: "course-updates",
      createdBy: admin.id,
    });
    expect(replacement.id).not.toBe(original.id);
  });

  it("enforces seeded designation lookup values for teacher profiles", async () => {
    const teacher = await createUser({
      email: "schema-designation@test.com",
      userType: "TEACHER",
    });

    await expect(
      prisma.teacherInfo.create({
        data: { teacherId: teacher.id, designation: "Unseeded Designation" },
      }),
    ).rejects.toThrow();

    const teacherInfo = await prisma.teacherInfo.create({
      data: { teacherId: teacher.id, designation: "Lecturer" },
    });
    expect(teacherInfo.designation).toBe("Lecturer");
  });
});
