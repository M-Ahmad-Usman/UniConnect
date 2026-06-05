import { randomUUID } from "node:crypto";

import { prisma } from "../../src/config/prisma.js";
import { NotFoundError, ValidationError } from "../../src/shared/errors/index.js";
import {
  isPublicId,
  mapClassPublicDto,
  mapPublicDtoArray,
  mapServerPublicDto,
  mapUserPublicDto,
  parsePublicId,
  resolveChannelPublicId,
  resolveClassPublicId,
  resolvePostPublicId,
  resolvePublicId,
  resolveServerPublicId,
  resolveSocietyPublicId,
  resolveUserPublicId,
} from "../../src/shared/ids/index.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  apiId,
  createAdmin,
  createChannel,
  createClass,
  createDepartment,
  createPost,
  createProgram,
  createSociety,
  createStudentWithInfo,
  createTeacherWithInfo,
  entityIds,
} from "../helpers/factory.js";

const VALID_UUID_V7 = "0198f1f0-0000-7000-8000-000000000000";
const VALID_UUID_V7_UPPER = "0198F1F0-0000-7000-8000-000000000000";
const UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";

function hasOwnKey(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

async function createCoreFixtures() {
  const admin = await createAdmin({ email: "public-id-admin@test.com" });
  const department = await createDepartment({ code: "PID-1", creatorId: admin.id });
  const program = await createProgram(department.id, { code: "PID-P1" });
  const classRecord = await createClass(program.id, { creatorId: admin.id });
  const teacher = await createTeacherWithInfo(department.id, {
    email: "public-id-teacher@test.com",
  });
  const student = await createStudentWithInfo(classRecord.id, department.id, {
    email: "public-id-student@test.com",
  });
  const { society, server } = await createSociety(
    department.id,
    student.id,
    teacher.id,
    { name: "Public ID Society", creatorId: admin.id },
  );
  const channel = await createChannel(server.id, {
    name: "public-id-feed",
    createdBy: admin.id,
  });
  const post = await createPost(channel.id, student.id);

  return {
    admin,
    classRecord,
    society,
    server,
    channel,
    post,
  };
}

describe("Module 2 - Public ID Foundation", () => {
  describe("UUIDv7 validation", () => {
    it("accepts UUIDv7 public IDs and normalizes casing", () => {
      expect(isPublicId(VALID_UUID_V7)).toBe(true);
      expect(parsePublicId(VALID_UUID_V7_UPPER)).toBe(VALID_UUID_V7);
    });

    it.each([
      ["numeric string", "1"],
      ["UUIDv4", UUID_V4],
      ["malformed UUID", "not-a-uuid"],
      ["empty string", ""],
      ["non-string", 123],
    ])("rejects %s as a public ID", (_label, value) => {
      expect(() => parsePublicId(value)).toThrow(ValidationError);
      expect(isPublicId(value)).toBe(false);
    });
  });

  describe("public-ID resolvers", () => {
    beforeEach(async () => {
      await resetDB();
    });

    it("resolves every core entity by UUIDv7 public ID", async () => {
      const { admin, classRecord, society, server, channel, post } = await createCoreFixtures();

      await expect(resolvePublicId("user", admin.publicId)).resolves.toEqual({
        id: admin.id,
        publicId: admin.publicId,
      });
      await expect(resolveClassPublicId(classRecord.publicId)).resolves.toEqual({
        id: classRecord.id,
        publicId: classRecord.publicId,
      });
      await expect(resolveSocietyPublicId(society.publicId)).resolves.toEqual({
        id: society.id,
        publicId: society.publicId,
      });
      await expect(resolveServerPublicId(server.publicId)).resolves.toEqual({
        id: server.id,
        publicId: server.publicId,
      });
      await expect(resolveChannelPublicId(channel.publicId)).resolves.toEqual({
        id: channel.id,
        publicId: channel.publicId,
      });
      await expect(resolvePostPublicId(post.publicId)).resolves.toEqual({
        id: post.id,
        publicId: post.publicId,
      });
    });

    it("throws typed errors for invalid or missing public IDs", async () => {
      await expect(resolveUserPublicId("1")).rejects.toBeInstanceOf(ValidationError);
      await expect(resolveUserPublicId(VALID_UUID_V7)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("excludes soft-deleted records by default and resolves them only when requested", async () => {
      const { admin, society, server, channel, post } = await createCoreFixtures();
      const deletedAt = new Date();
      const deletedCascadeId = randomUUID();

      await prisma.user.update({
        where: { id: admin.id },
        data: { isDeleted: true, deletedAt },
      });
      await prisma.society.update({
        where: { id: society.id },
        data: { isDeleted: true, status: "SUSPENDED", deletedAt, deletedCascadeId },
      });
      await prisma.server.update({
        where: { id: server.id },
        data: { isDeleted: true, deletedAt, deletedCascadeId },
      });
      await prisma.channel.update({
        where: { id: channel.id },
        data: { isDeleted: true, deletedAt, deletedCascadeId },
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { isDeleted: true, deletedAt },
      });

      await expect(resolveUserPublicId(admin.publicId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(resolveSocietyPublicId(society.publicId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(resolveServerPublicId(server.publicId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(resolveChannelPublicId(channel.publicId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(resolvePostPublicId(post.publicId)).rejects.toBeInstanceOf(NotFoundError);

      await expect(resolveUserPublicId(admin.publicId, { includeDeleted: true })).resolves.toEqual({
        id: admin.id,
        publicId: admin.publicId,
      });
      await expect(resolveSocietyPublicId(society.publicId, { includeDeleted: true })).resolves.toEqual({
        id: society.id,
        publicId: society.publicId,
      });
      await expect(resolveServerPublicId(server.publicId, { includeDeleted: true })).resolves.toEqual({
        id: server.id,
        publicId: server.publicId,
      });
      await expect(resolveChannelPublicId(channel.publicId, { includeDeleted: true })).resolves.toEqual({
        id: channel.id,
        publicId: channel.publicId,
      });
      await expect(resolvePostPublicId(post.publicId, { includeDeleted: true })).resolves.toEqual({
        id: post.id,
        publicId: post.publicId,
      });
    });

    it("rejects internal numeric IDs through the public resolver", async () => {
      const { server } = await createCoreFixtures();

      await expect(resolvePublicId("server", server.id)).rejects.toBeInstanceOf(ValidationError);
      await expect(resolvePublicId("server", String(server.id))).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe("public DTO mappers", () => {
    it("omits internal IDs from core DTOs while preserving catalog numeric IDs", () => {
      const userDto = mapUserPublicDto({
        id: 1,
        publicId: VALID_UUID_V7,
        fullName: "Public User",
        department: { id: 10, name: "Computer Science" },
      });

      expect(hasOwnKey(userDto, "id")).toBe(false);
      expect(userDto.publicId).toBe(VALID_UUID_V7);
      expect(userDto.department.id).toBe(10);
    });

    it("supports explicit composition for nested core DTOs", () => {
      const classDto = mapClassPublicDto({
        id: 2,
        publicId: "0198f1f0-0000-7000-8000-000000000001",
        section: "A",
      });
      const serverDto = mapServerPublicDto({
        id: 1,
        publicId: VALID_UUID_V7,
        name: "Server",
        department: { id: 10, name: "Computer Science" },
        class: classDto,
      });

      expect(hasOwnKey(serverDto, "id")).toBe(false);
      expect(hasOwnKey(serverDto.class, "id")).toBe(false);
      expect(serverDto.department.id).toBe(10);
    });

    it("maps public DTO arrays with entity-specific mappers", () => {
      const mapped = mapPublicDtoArray(
        [
          { id: 1, publicId: VALID_UUID_V7, name: "Server A" },
          { id: 2, publicId: "0198f1f0-0000-7000-8000-000000000001", name: "Server B" },
        ],
        mapServerPublicDto,
      );

      expect(mapped).toHaveLength(2);
      expect(mapped.every((item) => !hasOwnKey(item, "id"))).toBe(true);
      expect(mapped.map((item) => item.publicId)).toEqual([
        VALID_UUID_V7,
        "0198f1f0-0000-7000-8000-000000000001",
      ]);
    });
  });

  describe("test factory API-ID helpers", () => {
    beforeEach(async () => {
      await resetDB();
    });

    it("exposes public IDs for future API tests without hiding internal DB IDs", async () => {
      const admin = await createAdmin({ email: "api-id-admin@test.com" });

      expect(apiId(admin)).toBe(admin.publicId);
      expect(entityIds(admin)).toEqual({
        internalId: admin.id,
        publicId: admin.publicId,
      });
    });
  });
});
