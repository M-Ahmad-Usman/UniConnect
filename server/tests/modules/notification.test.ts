import request from "supertest";
import { jest } from "@jest/globals";
import http from "node:http";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import { getIO, initializeSocket, resetIO } from "../../src/socket/index.js";
import { appEvents, APP_EVENTS } from "../../src/shared/events.js";
import {
  createUser,
  createDepartment,
  createProgram,
  createClass,
  createTeacherWithInfo,
  createStudentWithInfo,
  createChannel,
  createNotification,
  createNotificationPreference,
  createPost,
  addServerMembership,
  loginAs,
  seedRolesAndPermissions,
  assignHOD,
  apiId,
  apiServerId,
} from "../helpers/factory.js";

/** Short unique suffix */
let uidCounter = 0;
function uid(): string {
  return (++uidCounter).toString(36);
}

async function internalPostId(publicId: string): Promise<number> {
  const post = await prisma.post.findUniqueOrThrow({
    where: { publicId },
    select: { id: true },
  });
  return post.id;
}

beforeAll(async () => {
  await resetDB();
  await seedRolesAndPermissions();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Notifications", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // POST CREATION → NOTIFICATION GENERATION (via EventEmitter)
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Post creation → notification generation", () => {
    it("should generate notifications for subscribed channel members when a post is created", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NTF-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-ntf-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu1-ntf-${u}@test.com`,
        password: "Pass@1234",
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu2-ntf-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `ann-${u}`,
        type: "ANNOUNCEMENT",
      });

      const cookies = await loginAs(`hod-ntf-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Test Notification",
          content: "Content for notification test",
        });

      expect(res.status).toBe(201);

      // Wait briefly for async notification creation
      await new Promise((r) => setTimeout(r, 500));

      // Verify notifications were created for student1 and student2
      const postId = await internalPostId(res.body.data.publicId);
      const notifications = await prisma.notification.findMany({
        where: { postId },
        orderBy: { userId: "asc" },
      });
      const server = await prisma.server.findUnique({
        where: { id: dept.serverId },
        select: { name: true },
      });
      expect(server).not.toBeNull();

      // Both students are members of the dept server, so they should get notifications
      const recipientIds = notifications.map((n) => n.userId);
      expect(recipientIds).toContain(student1.id);
      expect(recipientIds).toContain(student2.id);
      // Author should NOT get a notification
      expect(recipientIds).not.toContain(hod.id);
      // All notifications should be type NEW_POST
      expect(notifications.every((n) => n.type === "NEW_POST")).toBe(true);
      expect(notifications[0]?.message).toContain(server!.name);
      expect(notifications[0]?.message).toContain(`#${channel.name}`);
    });

    it("should mark urgent post notifications with urgent indicator", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `URG-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-urg-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-urg-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `ann-urg-${u}`,
        type: "ANNOUNCEMENT",
      });

      const cookies = await loginAs(`hod-urg-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Critical Update",
          content: "Urgent content",
          priority: "URGENT",
        });

      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 500));

      const postId = await internalPostId(res.body.data.publicId);
      const notifications = await prisma.notification.findMany({
        where: { postId },
      });
      const server = await prisma.server.findUnique({
        where: { id: dept.serverId },
        select: { name: true },
      });
      expect(server).not.toBeNull();

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      // Urgent notifications should have the 🚨 prefix in title
      for (const n of notifications) {
        expect(n.title).toContain("🚨");
        expect(n.title).toContain("[URGENT]");
        expect(n.message).toContain("Urgent");
        expect(n.message).toContain(server!.name);
        expect(n.message).toContain(`#${channel.name}`);
      }
    });

    it("should delete linked notifications when a post is deleted", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DEL-NTF-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-del-ntf-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-del-ntf-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `ann-del-ntf-${u}`,
        type: "ANNOUNCEMENT",
      });

      const cookies = await loginAs(`hod-del-ntf-${u}@test.com`, "Pass@1234");
      const postRes = await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Delete Notification",
          content: "This post will be deleted.",
        });

      expect(postRes.status).toBe(201);
      await new Promise((r) => setTimeout(r, 500));

      const postId = await internalPostId(postRes.body.data.publicId);
      const notificationBeforeDelete = await prisma.notification.findFirst({
        where: { postId, userId: student.id },
      });
      expect(notificationBeforeDelete).not.toBeNull();

      const deleteRes = await request(app)
        .delete(`/api/posts/${postRes.body.data.publicId}`)
        .set("Cookie", cookies);

      expect(deleteRes.status).toBe(200);

      const notificationCount = await prisma.notification.count({
        where: { postId },
      });
      expect(notificationCount).toBe(0);
    });

    it("should NOT generate notification for unsubscribed user (channel-level)", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNS-CH-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-unsch-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const subscribedStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `sub-unsch-${u}@test.com`,
        password: "Pass@1234",
      });
      const unsubscribedStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `unsub-unsch-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `gen-unsch-${u}`,
        type: "GENERAL",
      });

      // Unsubscribe the student from this specific channel
      await createNotificationPreference(
        unsubscribedStudent.id,
        dept.serverId,
        {
          scopeType: "CHANNEL",
          channelId: channel.id,
          isSubscribed: false,
        },
      );

      const cookies = await loginAs(`hod-unsch-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Test Unsub Channel",
          content: "Should skip unsubscribed",
        });

      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 500));

      const postId = await internalPostId(res.body.data.publicId);
      const notifications = await prisma.notification.findMany({
        where: { postId },
      });

      const recipientIds = notifications.map((n) => n.userId);
      expect(recipientIds).toContain(subscribedStudent.id);
      expect(recipientIds).not.toContain(unsubscribedStudent.id);
    });

    it("should NOT generate notifications for user unsubscribed from server", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNS-SV-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-unssv-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const subscribedStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `sub-unssv-${u}@test.com`,
        password: "Pass@1234",
      });
      const unsubscribedStudent = await createStudentWithInfo(cls.id, dept.id, {
        email: `unsub-unssv-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `gen-unssv-${u}`,
        type: "GENERAL",
      });

      // Unsubscribe from the entire server
      await createNotificationPreference(
        unsubscribedStudent.id,
        dept.serverId,
        {
          scopeType: "SERVER",
          isSubscribed: false,
        },
      );

      const cookies = await loginAs(`hod-unssv-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Test Unsub Server",
          content: "Should skip server-unsubbed",
        });

      expect(res.status).toBe(201);
      await new Promise((r) => setTimeout(r, 500));

      const postId = await internalPostId(res.body.data.publicId);
      const notifications = await prisma.notification.findMany({
        where: { postId },
      });

      const recipientIds = notifications.map((n) => n.userId);
      expect(recipientIds).toContain(subscribedStudent.id);
      expect(recipientIds).not.toContain(unsubscribedStudent.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENT → NOTIFICATION GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Role assignment → notification generation", () => {
    it("should generate a role-assigned notification when a role is assigned", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-role-ntf-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `RNTF-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-role-ntf-${u}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/platform-assignments")
        .set("Cookie", cookies)
        .send({
          userPublicId: student.publicId,
          role: "server_moderator",
          serverPublicId: (await prisma.server.findUniqueOrThrow({ where: { id: dept.serverId } })).publicId,
        });

      expect(res.status).toBe(201);

      const notification = await prisma.notification.findFirst({
        where: { userId: student.id, type: "ROLE_ASSIGNED" },
        select: { title: true, message: true, postId: true },
      });

      expect(notification).not.toBeNull();
      expect(notification!.title).toContain("Server Moderator");
      expect(notification!.message).toContain("assigned");
      expect(notification!.postId).toBeNull();
    });

    it("should suppress role-assigned notification when role notifications are muted", async () => {
      const u = uid();
      const admin = await createUser({
        email: `admin-role-muted-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: `RMUT-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-role-muted-${u}@test.com`,
        password: "Pass@1234",
      });
      await createNotificationPreference(student.id, dept.serverId, {
        notificationType: "ROLE_ASSIGNED",
        scopeType: "SERVER",
        isSubscribed: false,
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/roles/platform-assignments")
        .set("Cookie", cookies)
        .send({
          userPublicId: student.publicId,
          role: "server_moderator",
          serverPublicId: (await prisma.server.findUniqueOrThrow({ where: { id: dept.serverId } })).publicId,
        });

      expect(res.status).toBe(201);

      const count = await prisma.notification.count({
        where: { userId: student.id, type: "ROLE_ASSIGNED" },
      });

      expect(count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/notifications
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/notifications", () => {
    it("should return paginated notifications, newest first → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LIST-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-list-${u}@test.com`,
        password: "Pass@1234",
      });

      // Create notifications with different timestamps
      const now = new Date();
      await createNotification(student.id, {
        title: "Old notification",
        createdAt: new Date(now.getTime() - 60000),
      });
      await createNotification(student.id, {
        title: "New notification",
        createdAt: new Date(now.getTime()),
      });

      const cookies = await loginAs(`stu-list-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notifications")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);

      // Verify newest first
      const dates = res.body.data.map((n: { createdAt: string }) =>
        new Date(n.createdAt).getTime(),
      );
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it("should filter by type → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `FILT-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-filt-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotification(student.id, {
        type: "NEW_POST",
        title: "Post notif",
      });
      await createNotification(student.id, {
        type: "ROLE_ASSIGNED",
        title: "Role notif",
      });

      const cookies = await loginAs(`stu-filt-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notifications?type=NEW_POST")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((n: { type: string }) => n.type === "NEW_POST"),
      ).toBe(true);
    });

    it("should filter unread only → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNRD-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-unrd-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotification(student.id, { title: "Unread", readAt: null });
      await createNotification(student.id, {
        title: "Read",
        readAt: new Date(),
      });

      const cookies = await loginAs(`stu-unrd-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notifications?unreadOnly=true")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every(
          (n: { readAt: string | null }) => n.readAt === null,
        ),
      ).toBe(true);
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app).get("/api/notifications");
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/notifications/unread-count
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/notifications/unread-count", () => {
    it("should return correct unread count → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CNT-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-cnt-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotification(student.id, { title: "Unread 1" });
      await createNotification(student.id, { title: "Unread 2" });
      await createNotification(student.id, {
        title: "Read",
        readAt: new Date(),
      });

      const cookies = await loginAs(`stu-cnt-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notifications/unread-count")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/notifications/:id/read
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/notifications/:id/read", () => {
    it("should mark notification as read → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `MK-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-mk-${u}@test.com`,
        password: "Pass@1234",
      });

      const notification = await createNotification(student.id, {
        title: "To Read",
      });
      const cookies = await loginAs(`stu-mk-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.readAt).not.toBeNull();

      // Verify in DB
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.readAt).not.toBeNull();
    });

    it("should return 404 when marking another user's notification", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `OWN-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student1 = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu1-own-${u}@test.com`,
        password: "Pass@1234",
      });
      const student2 = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu2-own-${u}@test.com`,
        password: "Pass@1234",
      });

      const notification = await createNotification(student1.id, {
        title: "Private",
      });
      const cookies = await loginAs(`stu2-own-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
    });

    it("should handle already-read notification gracefully → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ALR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-alr-${u}@test.com`,
        password: "Pass@1234",
      });

      const notification = await createNotification(student.id, {
        title: "Already Read",
        readAt: new Date(),
      });
      const cookies = await loginAs(`stu-alr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/notifications/${notification.id}/read`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.readAt).not.toBeNull();
    });

    it("should return 404 for non-existent notification", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NE-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-ne-${u}@test.com`,
        password: "Pass@1234",
      });
      const cookies = await loginAs(`stu-ne-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notifications/999999/read")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/notifications/read-all
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/notifications/read-all", () => {
    it("should mark all notifications as read → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ALL-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-all-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotification(student.id, { title: "Notif 1" });
      await createNotification(student.id, { title: "Notif 2" });
      await createNotification(student.id, { title: "Notif 3" });

      const cookies = await loginAs(`stu-all-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notifications/read-all")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(3);

      // Verify all are read
      const unread = await prisma.notification.count({
        where: { userId: student.id, readAt: null },
      });
      expect(unread).toBe(0);
    });

    it("should return count 0 when no unread notifications", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NOUNR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-nounr-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotification(student.id, {
        title: "Read",
        readAt: new Date(),
      });

      const cookies = await loginAs(`stu-nounr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notifications/read-all")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/notification-preferences
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/notification-preferences", () => {
    it("should return user's notification preferences → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PREF-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-pref-${u}@test.com`,
        password: "Pass@1234",
      });

      // Create a preference
      await createNotificationPreference(student.id, dept.serverId, {
        scopeType: "SERVER",
        isSubscribed: false,
      });

      const cookies = await loginAs(`stu-pref-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notification-preferences")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].scopeType).toBe("SERVER");
      expect(res.body.data[0].notificationType).toBe("NEW_POST");
      expect(res.body.data[0].isSubscribed).toBe(false);
      expect(res.body.data[0].server).toBeDefined();
    });

    it("should filter preferences by server and notification type → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PFLT-${u}` });
      const otherDept = await createDepartment({ code: `PFLTO-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-pflt-${u}@test.com`,
        password: "Pass@1234",
      });

      await createNotificationPreference(student.id, dept.serverId, {
        notificationType: "ROLE_ASSIGNED",
        scopeType: "SERVER",
        isSubscribed: false,
      });
      await createNotificationPreference(student.id, otherDept.serverId, {
        notificationType: "NEW_POST",
        scopeType: "SERVER",
        isSubscribed: false,
      });

      const cookies = await loginAs(`stu-pflt-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(
          `/api/notification-preferences?serverPublicId=${await apiServerId(dept.serverId)}&notificationType=ROLE_ASSIGNED`,
        )
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].serverPublicId).toBe(await apiServerId(dept.serverId));
      expect(res.body.data[0].notificationType).toBe("ROLE_ASSIGNED");
    });

    it("should return empty array when no preferences exist → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NOPRF-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-noprf-${u}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(`stu-noprf-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/notification-preferences")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/notification-preferences
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/notification-preferences", () => {
    it("should unsubscribe from a channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNSC-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-unsc-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, { name: `ch-${u}` });
      const cookies = await loginAs(`stu-unsc-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept.serverId),
          channelPublicId: apiId(channel),
          isSubscribed: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSubscribed).toBe(false);
      expect(res.body.data.notificationType).toBe("NEW_POST");
      expect(res.body.data.scopeType).toBe("CHANNEL");
      expect(res.body.data.channelPublicId).toBe(channel.publicId);
    });

    it("should unsubscribe from a server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UNSS-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-unss-${u}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(`stu-unss-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "SERVER",
          serverPublicId: await apiServerId(dept.serverId),
          isSubscribed: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isSubscribed).toBe(false);
      expect(res.body.data.notificationType).toBe("NEW_POST");
      expect(res.body.data.scopeType).toBe("SERVER");
    });

    it("should update role assignment server preference → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ROLEP-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-rolep-${u}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(`stu-rolep-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          notificationType: "ROLE_ASSIGNED",
          scopeType: "SERVER",
          serverPublicId: await apiServerId(dept.serverId),
          isSubscribed: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notificationType).toBe("ROLE_ASSIGNED");
      expect(res.body.data.scopeType).toBe("SERVER");
      expect(res.body.data.isSubscribed).toBe(false);
    });

    it("should reject channel-scoped role assignment preference → 400", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `ROLEC-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-rolec-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `rolec-${u}`,
      });

      const cookies = await loginAs(`stu-rolec-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          notificationType: "ROLE_ASSIGNED",
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept.serverId),
          channelPublicId: apiId(channel),
          isSubscribed: false,
        });

      expect(res.status).toBe(400);
    });

    it("should re-subscribe to a channel → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `RESUB-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-resub-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `ch-resub-${u}`,
      });

      // First unsubscribe
      await createNotificationPreference(student.id, dept.serverId, {
        scopeType: "CHANNEL",
        channelId: channel.id,
        isSubscribed: false,
      });

      const cookies = await loginAs(`stu-resub-${u}@test.com`, "Pass@1234");

      // Then re-subscribe
      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept.serverId),
          channelPublicId: apiId(channel),
          isSubscribed: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isSubscribed).toBe(true);
    });

    it("should return 403 when user is not a server member", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `NMBR-${u}` });
      // Create user who is NOT a member of this server's dept
      const otherDept = await createDepartment({ code: `OTH-${u}` });
      const program = await createProgram(otherDept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, otherDept.id, {
        email: `stu-nmbr-${u}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(`stu-nmbr-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "SERVER",
          serverPublicId: await apiServerId(dept.serverId),
          isSubscribed: false,
        });

      expect(res.status).toBe(403);
    });

    it("should return 400 when channelId missing for CHANNEL scope", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `VALD-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-vald-${u}@test.com`,
        password: "Pass@1234",
      });

      const cookies = await loginAs(`stu-vald-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept.serverId),
          isSubscribed: false,
        });

      expect(res.status).toBe(400);
    });

    it("should return 404 when channel does not belong to server", async () => {
      const u = uid();
      const dept1 = await createDepartment({ code: `SV1-${u}` });
      const dept2 = await createDepartment({ code: `SV2-${u}` });
      const program = await createProgram(dept1.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept1.id, {
        email: `stu-chsv-${u}@test.com`,
        password: "Pass@1234",
      });

      // Create channel in dept2's server
      const channel = await createChannel(dept2.serverId, {
        name: `ch-other-${u}`,
      });

      const cookies = await loginAs(`stu-chsv-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept1.serverId),
          channelPublicId: apiId(channel),
          isSubscribed: false,
        });

      expect(res.status).toBe(404);
    });

    it("should reject preference mutations for archived channels → 409", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PREF-AR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-pref-ar-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `pref-archived-${u}`,
      });
      await prisma.channel.update({
        where: { id: channel.id },
        data: { isArchived: true, archivedAt: new Date() },
      });
      const cookies = await loginAs(`stu-pref-ar-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch("/api/notification-preferences")
        .set("Cookie", cookies)
        .send({
          scopeType: "CHANNEL",
          serverPublicId: await apiServerId(dept.serverId),
          channelPublicId: apiId(channel),
          isSubscribed: false,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CHANNEL_ARCHIVED");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Socket.IO Integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Socket.IO integration", () => {
    let httpServer: http.Server;
    let clientSocket: ClientSocket;
    let serverPort: number;

    beforeAll((done) => {
      httpServer = http.createServer(app);
      initializeSocket(httpServer);
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        serverPort = typeof addr === "object" && addr ? addr.port : 0;
        done();
      });
    });

    afterEach(() => {
      if (clientSocket?.connected) {
        clientSocket.disconnect();
      }
    });

    afterAll((done) => {
      resetIO();
      httpServer.close(done);
    });

    it("should emit notification:new when a post is created", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SIO-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);

      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-sio-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);

      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-sio-${u}@test.com`,
        password: "Pass@1234",
      });

      const channel = await createChannel(dept.serverId, {
        name: `ann-sio-${u}`,
        type: "ANNOUNCEMENT",
      });

      // Login as student to get cookies for Socket.IO auth
      const cookies = await loginAs(`stu-sio-${u}@test.com`, "Pass@1234");
      const accessToken = cookies
        .find((c: string) => c.startsWith("access_token="))
        ?.split(";")[0]
        ?.split("=")
        .slice(1)
        .join("=");

      // Connect Socket.IO client with JWT cookie
      const notificationPromise = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timeout waiting for notification")),
          5000,
        );

        clientSocket = ioClient(`http://127.0.0.1:${serverPort}`, {
          path: "/api/socket.io",
          extraHeaders: {
            cookie: `access_token=${accessToken}`,
          },
        });

        clientSocket.on("notification:new", (data: unknown) => {
          clearTimeout(timeout);
          resolve(data);
        });

        clientSocket.on("connect_error", (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Wait for socket to connect
      await new Promise<void>((resolve) => {
        clientSocket.on("connect", () => resolve());
      });

      // Create a post (as HOD) — this should trigger notification for the student
      const hodCookies = await loginAs(`hod-sio-${u}@test.com`, "Pass@1234");
      await request(app)
        .post(`/api/channels/${apiId(channel)}/posts`)
        .set("Cookie", hodCookies)
        .send({
          title: "Socket Test Post",
          content: "Socket.IO notification test",
        });

      const notification = await notificationPromise;
      expect(notification).toBeDefined();
      expect((notification as { title: string }).title).toBe(
        "Socket Test Post",
      );
    });

    it("should reject connection without valid token", (done) => {
      const badClient = ioClient(`http://127.0.0.1:${serverPort}`, {
        path: "/api/socket.io",
        extraHeaders: {
          cookie: "access_token=invalid-token",
        },
      });

      badClient.on("connect_error", (err: Error) => {
        expect(err.message).toContain("Authentication required");
        badClient.disconnect();
        done();
      });
    });

    it("should reject connection without any cookie", (done) => {
      const noAuthClient = ioClient(`http://127.0.0.1:${serverPort}`, {
        path: "/api/socket.io",
      });

      noAuthClient.on("connect_error", (err: Error) => {
        expect(err.message).toContain("Authentication required");
        noAuthClient.disconnect();
        done();
      });
    });

    it("should enforce public-ID channel joins, archived rejection, leave, and burst room cap", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `SIO-ROOM-${u}` });
      const student = await createTeacherWithInfo(dept.id, {
        email: `student-sio-room-${u}@test.com`,
        password: "Pass@1234",
      });
      const activeChannels = await Promise.all(
        Array.from({ length: 33 }, (_, index) =>
          createChannel(dept.serverId, { name: `room-${index}-${u}` }),
        ),
      );
      const archivedChannel = await createChannel(dept.serverId, {
        name: `archived-room-${u}`,
      });
      await prisma.channel.update({
        where: { id: archivedChannel.id },
        data: { isArchived: true, archivedAt: new Date() },
      });
      const cookies = await loginAs(`student-sio-room-${u}@test.com`, "Pass@1234");
      const accessToken = cookies
        .find((cookie: string) => cookie.startsWith("access_token="))
        ?.split(";")[0]
        ?.split("=")
        .slice(1)
        .join("=");

      clientSocket = ioClient(`http://127.0.0.1:${serverPort}`, {
        path: "/api/socket.io",
        extraHeaders: {
          cookie: `access_token=${accessToken}`,
        },
      });
      await new Promise<void>((resolve, reject) => {
        clientSocket.on("connect", () => resolve());
        clientSocket.on("connect_error", reject);
      });

      clientSocket.emit("channel:join", { channelPublicId: String(activeChannels[0]!.id) });
      clientSocket.emit("channel:join", { channelPublicId: archivedChannel.publicId });
      await new Promise((resolve) => setTimeout(resolve, 100));
      for (const channel of activeChannels) {
        clientSocket.emit("channel:join", { channelPublicId: channel.publicId });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      const socketServer = getIO();
      expect(socketServer).not.toBeNull();
      const serverSocket = [...socketServer!.sockets.sockets.values()].find((socket) =>
        socket.rooms.has(`user:${student.id}`),
      );
      expect(serverSocket).toBeDefined();
      const channelRooms = [...serverSocket!.rooms].filter((room) =>
        room.startsWith("channel:"),
      );
      expect(channelRooms).toHaveLength(32);
      expect(serverSocket!.rooms.has(`channel:${archivedChannel.id}`)).toBe(false);
      expect(serverSocket!.rooms.has(`channel:${activeChannels[32]!.id}`)).toBe(false);

      clientSocket.emit("channel:leave", {
        channelPublicId: activeChannels[0]!.publicId,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      clientSocket.emit("channel:join", {
        channelPublicId: activeChannels[32]!.publicId,
      });
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(serverSocket!.rooms.has(`channel:${activeChannels[0]!.id}`)).toBe(false);
      expect(serverSocket!.rooms.has(`channel:${activeChannels[32]!.id}`)).toBe(true);
    });
  });
});
