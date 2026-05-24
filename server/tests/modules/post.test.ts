import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { cloudinaryService } from "../../src/config/cloudinary.js";
import { VALID_JPEG_BUFFER, VALID_PNG_BUFFER } from "../helpers/fixtures.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createUser,
  createDepartment,
  createProgram,
  createClass,
  createTeacherWithInfo,
  createStudentWithInfo,
  createChannel,
  createCourse,
  createPost,
  createPostAttachment,
  assignHOD,
  assignCR,
  addServerMembership,
  loginAs,
  seedRolesAndPermissions,
} from "../helpers/factory.js";

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

describe("Module 9 - Posts & Announcements", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/channels/:id/posts
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/channels/:id/posts", () => {
    it("should allow HOD to create a post in dept announcement channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-HOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-cp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `ann-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      const cookies = await loginAs(`hod-cp-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Important Announcement",
          content: "Please read carefully.",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Important Announcement");
      expect(res.body.data.content).toBe("Please read carefully.");
      expect(res.body.data.priority).toBe("NORMAL");
      expect(res.body.data.author.id).toBe(hod.id);
      expect(res.body.data.author.badges).toContain("hod");
    });

    it("should allow any member to post in GENERAL channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-GEN-${u}` });
      const student = await createStudentWithInfo(
        (await createClass(await (await createProgram(dept.id)).id)).id,
        dept.id,
        { email: `stu-gen-${u}@test.com`, password: "Pass@1234" },
      );
      const channel = await createChannel(dept.serverId, {
        name: `gen-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`stu-gen-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "Hello Everyone", content: "General discussion." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Hello Everyone");
    });

    it("should reject student posting in ANNOUNCEMENT channel → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-SA-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `stu-ann-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `ann-deny-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      const cookies = await loginAs(`stu-ann-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Unauthorized Post",
          content: "Should not be allowed.",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow teacher in assigned course channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-TCH-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-crs-${u}@test.com`,
        password: "Pass@1234",
      });
      const course = await createCourse(dept.id, { code: `CRS-CP-${u}` });

      await prisma.teaches.create({
        data: { teacherId: teacher.id, courseId: course.id, classId: cls.id },
      });
      await addServerMembership(teacher.id, cls.serverId);

      const channel = await createChannel(cls.serverId, {
        name: `crs-ch-${u}`,
        type: "COURSE",
        isAutoCreated: true,
        courseId: course.id,
      });
      const cookies = await loginAs(`tch-crs-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({
          title: "Lecture Notes",
          content: "Check the slides.",
          priority: "IMPORTANT",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.priority).toBe("IMPORTANT");
    });

    it("should reject teacher in non-assigned course channel → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-TNO-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-no-${u}@test.com`,
        password: "Pass@1234",
      });
      const course = await createCourse(dept.id, { code: `CRS-NO-${u}` });
      await addServerMembership(teacher.id, cls.serverId);

      const channel = await createChannel(cls.serverId, {
        name: `crs-no-${u}`,
        type: "COURSE",
        isAutoCreated: true,
        courseId: course.id,
      });
      const cookies = await loginAs(`tch-no-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "Wrong Course", content: "Should be denied." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject posting in locked channel → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-LK-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-lk-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `locked-${u}`,
          type: "GENERAL",
          isLocked: true,
          lockedAt: new Date(),
        },
      });
      const cookies = await loginAs(`hod-lk-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "Locked", content: "Cannot post here." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject non-member → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-NM-${u}` });
      const otherDept = await createDepartment({ code: `CP-NMO-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `tch-nm-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `nm-ch-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`tch-nm-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "No Access", content: "Not a member." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-VAL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-val-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `val-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`hod-val-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should allow admin to post in any channel → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-ADM-${u}` });
      const admin = await createUser({
        email: `admin-cp-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const channel = await createChannel(dept.serverId, {
        name: `admin-ch-${u}`,
        type: "ANNOUNCEMENT",
        isAutoCreated: true,
      });
      const cookies = await loginAs(`admin-cp-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .send({ title: "Admin Post", content: "Admin can post anywhere." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should create post with attachments → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-ATT-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-att-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `att-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`hod-att-${u}@test.com`, "Pass@1234");

      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({
          url: "https://cloudinary.com/post-attachments/test.jpg",
        });

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .field("title", "Post With Images")
        .field("content", "Check these images")
        .field("priority", "URGENT")
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "image1.jpg",
          contentType: "image/jpeg",
        })
        .attach("attachments", VALID_PNG_BUFFER, {
          filename: "image2.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Post With Images");
      expect(res.body.data.priority).toBe("URGENT");
      expect(res.body.data.attachments).toHaveLength(2);
      expect(res.body.data.attachments[0].fileUrl).toBe(
        "https://cloudinary.com/post-attachments/test.jpg",
      );
    });

    it("should return 400 for more than 3 attachments", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-AT3-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-at3-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `at3-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`hod-at3-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .field("title", "Too Many Images")
        .field("content", "Overflow")
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "a.jpg",
          contentType: "image/jpeg",
        })
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "b.jpg",
          contentType: "image/jpeg",
        })
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "c.jpg",
          contentType: "image/jpeg",
        })
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "d.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for invalid file type", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-FT-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-ft-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `ft-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`hod-ft-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies)
        .field("title", "Bad File")
        .field("content", "Not an image")
        .attach("attachments", Buffer.from("not-image"), {
          filename: "doc.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `CP-NE-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-ne-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const cookies = await loginAs(`hod-ne-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .post("/api/channels/999999/posts")
        .set("Cookie", cookies)
        .send({ title: "Ghost Channel", content: "Does not exist." });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/channels/:id/posts
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/channels/:id/posts", () => {
    it("should return paginated posts with pinned first → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-PIN-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-lp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `lp-${u}`,
        type: "GENERAL",
      });

      // Create posts: one pinned, two normal
      await createPost(channel.id, hod.id, {
        title: `Regular 1 ${u}`,
        createdAt: new Date("2026-02-01"),
      });
      await createPost(channel.id, hod.id, {
        title: `Regular 2 ${u}`,
        createdAt: new Date("2026-02-02"),
      });
      await createPost(channel.id, hod.id, {
        title: `Pinned ${u}`,
        isPinned: true,
        pinnedBy: hod.id,
        pinnedAt: new Date(),
        createdAt: new Date("2026-01-01"), // Older but pinned
      });

      const cookies = await loginAs(`hod-lp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      // Pinned first
      expect(res.body.data[0].title).toBe(`Pinned ${u}`);
      expect(res.body.data[0].isPinned).toBe(true);
      // Then by date desc
      expect(res.body.data[1].title).toBe(`Regular 2 ${u}`);
      expect(res.body.data[2].title).toBe(`Regular 1 ${u}`);
      // Pagination
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.page).toBe(1);
    });

    it("should include attachment previews in list results → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-ATT-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-att-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `att-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Post with attachment ${u}`,
      });
      await createPostAttachment(post.id, {
        fileUrl: `https://res.cloudinary.com/test/post-attachments/${u}.jpg`,
        fileSize: 2048,
      });

      const cookies = await loginAs(`hod-att-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe(`Post with attachment ${u}`);
      expect(res.body.data[0]._count.attachments).toBe(1);
      expect(res.body.data[0].attachments).toHaveLength(1);
      expect(res.body.data[0].attachments[0].fileUrl).toBe(
        `https://res.cloudinary.com/test/post-attachments/${u}.jpg`,
      );
    });

    it("should filter posts by search query → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-SRC-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-src-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `src-${u}`,
        type: "GENERAL",
      });

      await createPost(channel.id, hod.id, { title: `Exam Schedule ${u}` });
      await createPost(channel.id, hod.id, { title: `Assignment ${u}` });
      await createPost(channel.id, hod.id, { title: `Exam Retake ${u}` });

      const cookies = await loginAs(`hod-src-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts?search=Exam`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(
        res.body.data.every((p: { title: string }) => p.title.includes("Exam")),
      ).toBe(true);
    });

    it("should filter posts by priority → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-PRI-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-pri-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `pri-${u}`,
        type: "GENERAL",
      });

      await createPost(channel.id, hod.id, {
        title: `Normal ${u}`,
        priority: "NORMAL",
      });
      await createPost(channel.id, hod.id, {
        title: `Urgent ${u}`,
        priority: "URGENT",
      });
      await createPost(channel.id, hod.id, {
        title: `Important ${u}`,
        priority: "IMPORTANT",
      });

      const cookies = await loginAs(`hod-pri-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts?priority=URGENT`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].priority).toBe("URGENT");
    });

    it("should filter posts by date range → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-DR-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-dr-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `dr-${u}`,
        type: "GENERAL",
      });

      await createPost(channel.id, hod.id, {
        title: `Jan Post ${u}`,
        createdAt: new Date("2026-01-15"),
      });
      await createPost(channel.id, hod.id, {
        title: `Feb Post ${u}`,
        createdAt: new Date("2026-02-15"),
      });
      await createPost(channel.id, hod.id, {
        title: `Mar Post ${u}`,
        createdAt: new Date("2026-03-15"),
      });

      const cookies = await loginAs(`hod-dr-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(
          `/api/channels/${channel.id}/posts?startDate=2026-02-01&endDate=2026-02-28`,
        )
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe(`Feb Post ${u}`);
    });

    it("should not include deleted posts → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-DEL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-del-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `del-${u}`,
        type: "GENERAL",
      });

      await createPost(channel.id, hod.id, { title: `Active ${u}` });
      const deletedPost = await createPost(channel.id, hod.id, {
        title: `Deleted ${u}`,
      });
      await prisma.post.update({
        where: { id: deletedPost.id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: hod.id },
      });

      const cookies = await loginAs(`hod-del-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe(`Active ${u}`);
    });

    it("should reject non-member → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-NM-${u}` });
      const otherDept = await createDepartment({ code: `LP-NMO-${u}` });
      const teacher = await createTeacherWithInfo(otherDept.id, {
        email: `tch-lnm-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `lnm-${u}`,
        type: "GENERAL",
      });
      const cookies = await loginAs(`tch-lnm-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for deleted channel", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-DC-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-dc-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await prisma.channel.create({
        data: {
          serverId: dept.serverId,
          name: `dc-${u}`,
          type: "GENERAL",
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
      const cookies = await loginAs(`hod-dc-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should support pagination with page and limit → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-PG-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-pg-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `pg-${u}`,
        type: "GENERAL",
      });

      // Create 5 posts
      for (let i = 0; i < 5; i++) {
        await createPost(channel.id, hod.id, { title: `Page Post ${i} ${u}` });
      }

      const cookies = await loginAs(`hod-pg-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts?page=2&limit=2`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(5);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it("should include author badges in list response → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `LP-BDG-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-bdg-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `bdg-${u}`,
        type: "GENERAL",
      });
      await createPost(channel.id, hod.id, { title: `Badge Post ${u}` });

      const cookies = await loginAs(`hod-bdg-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/channels/${channel.id}/posts`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.data[0].author.badges).toContain("hod");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/posts/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/posts/:id", () => {
    it("should return post detail with attachments and author badge → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `GP-DET-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-gp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `gp-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Detail ${u}`,
      });
      await createPostAttachment(post.id);

      const cookies = await loginAs(`hod-gp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(`Detail ${u}`);
      expect(res.body.data.attachments).toHaveLength(1);
      expect(res.body.data.attachments[0].fileUrl).toBeDefined();
      expect(res.body.data.author.badges).toContain("hod");
    });

    it("should return 404 for deleted post", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `GP-DL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-gpdl-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `gpdl-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Deleted ${u}`,
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: hod.id },
      });

      const cookies = await loginAs(`hod-gpdl-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for non-member", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `GP-NM-${u}` });
      const otherDept = await createDepartment({ code: `GP-NMO-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-gpnm-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const nonMember = await createTeacherWithInfo(otherDept.id, {
        email: `nm-gp-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `gpnm-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Private ${u}`,
      });

      const cookies = await loginAs(`nm-gp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent post", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `GP-404-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-gp404-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const cookies = await loginAs(`hod-gp404-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get("/api/posts/999999")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should allow admin to view any post → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `GP-ADM-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-gpadm-${u}@test.com`,
      });
      const channel = await createChannel(dept.serverId, {
        name: `gpadm-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, teacher.id, {
        title: `Admin View ${u}`,
      });
      const admin = await createUser({
        email: `admin-gp-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-gp-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/posts/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/posts/:id", () => {
    it("should allow author to edit within 24h → 200 with updatedAt set", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-24H-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-up-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `up-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Original ${u}`,
      });

      const cookies = await loginAs(`hod-up-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({ title: `Edited ${u}`, content: "Updated content" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(`Edited ${u}`);
      expect(res.body.data.content).toBe("Updated content");
      expect(res.body.data.updatedAt).not.toBeNull();
    });

    it("should reject edit after 24h → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-EXP-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-exp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `exp-${u}`,
        type: "GENERAL",
      });
      // Create post with createdAt 25 hours ago
      const post = await createPost(channel.id, hod.id, {
        title: `Old ${u}`,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });

      const cookies = await loginAs(`hod-exp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({ title: `Expired Edit ${u}` });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should reject non-author → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-NA-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-upna-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const otherTeacher = await createTeacherWithInfo(dept.id, {
        email: `tch-upna-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `upna-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Author Only ${u}`,
      });

      const cookies = await loginAs(`tch-upna-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({ title: `Hijacked ${u}` });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 for empty body", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-EB-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-eb-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `eb-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Empty ${u}`,
      });

      const cookies = await loginAs(`hod-eb-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for deleted post", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-DL-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-updl-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `updl-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Del Upd ${u}`,
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: hod.id },
      });

      const cookies = await loginAs(`hod-updl-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({ title: `Edit Deleted ${u}` });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should allow editing only priority → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `UP-PRI-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-uppri-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `uppri-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Priority ${u}`,
      });

      const cookies = await loginAs(`hod-uppri-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}`)
        .set("Cookie", cookies)
        .send({ priority: "URGENT" });

      expect(res.status).toBe(200);
      expect(res.body.data.priority).toBe("URGENT");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/posts/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe("DELETE /api/posts/:id", () => {
    it("should allow author to soft-delete → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DL-AU-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-dlau-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `dlau-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Delete Me ${u}`,
      });

      const cookies = await loginAs(`hod-dlau-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();

      // Verify soft-delete in DB
      const dbPost = await prisma.post.findUnique({ where: { id: post.id } });
      expect(dbPost!.isDeleted).toBe(true);
      expect(dbPost!.deletedBy).toBe(hod.id);
      expect(dbPost!.deletedAt).not.toBeNull();
    });

    it("should allow admin to soft-delete → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DL-ADM-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-dladm-${u}@test.com`,
      });
      const channel = await createChannel(dept.serverId, {
        name: `dladm-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, teacher.id, {
        title: `Admin Del ${u}`,
      });

      const admin = await createUser({
        email: `admin-dl-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-dl-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject non-author non-admin → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DL-NA-${u}` });
      const author = await createTeacherWithInfo(dept.id, {
        email: `auth-dlna-${u}@test.com`,
      });
      const other = await createTeacherWithInfo(dept.id, {
        email: `oth-dlna-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `dlna-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, author.id, {
        title: `Protected ${u}`,
      });

      const cookies = await loginAs(`oth-dlna-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for already deleted post", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `DL-AD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-dlad-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `dlad-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Already Del ${u}`,
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: hod.id },
      });

      const cookies = await loginAs(`hod-dlad-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /api/posts/:id/pin
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH /api/posts/:id/pin", () => {
    it("should allow HOD (channel manager) to pin a post → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PN-HOD-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-pn-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `pn-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Pin Me ${u}`,
      });

      const cookies = await loginAs(`hod-pn-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}/pin`)
        .set("Cookie", cookies)
        .send({ isPinned: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPinned).toBe(true);
      expect(res.body.data.pinnedAt).not.toBeNull();
    });

    it("should allow channel manager to unpin a post → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PN-UNP-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-unp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `unp-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Unpin Me ${u}`,
        isPinned: true,
        pinnedBy: hod.id,
        pinnedAt: new Date(),
      });

      const cookies = await loginAs(`hod-unp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}/pin`)
        .set("Cookie", cookies)
        .send({ isPinned: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(false);
      expect(res.body.data.pinnedAt).toBeNull();
    });

    it("should reject non-manager → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PN-NMG-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-pnnmg-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `pnnmg-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, teacher.id, {
        title: `No Pin ${u}`,
      });

      const cookies = await loginAs(`tch-pnnmg-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}/pin`)
        .set("Cookie", cookies)
        .send({ isPinned: true });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should allow admin to pin → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PN-ADM-${u}` });
      const teacher = await createTeacherWithInfo(dept.id, {
        email: `tch-pnadm-${u}@test.com`,
      });
      const channel = await createChannel(dept.serverId, {
        name: `pnadm-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, teacher.id, {
        title: `Admin Pin ${u}`,
      });

      const admin = await createUser({
        email: `admin-pn-${u}@test.com`,
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(`admin-pn-${u}@test.com`, "Pass@1234");

      const res = await request(app)
        .patch(`/api/posts/${post.id}/pin`)
        .set("Cookie", cookies)
        .send({ isPinned: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(true);
    });

    it("should allow CR to pin in class server → 200", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `PN-CR-${u}` });
      const program = await createProgram(dept.id);
      const cls = await createClass(program.id);
      const student = await createStudentWithInfo(cls.id, dept.id, {
        email: `cr-pn-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignCR(cls.id, student.id);
      const channel = await createChannel(cls.serverId, {
        name: `pncr-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, student.id, {
        title: `CR Pin ${u}`,
      });

      const cookies = await loginAs(`cr-pn-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .patch(`/api/posts/${post.id}/pin`)
        .set("Cookie", cookies)
        .send({ isPinned: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isPinned).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/posts/:id/attachments
  // ═══════════════════════════════════════════════════════════════════════════

  describe("POST /api/posts/:id/attachments", () => {
    it("should return 400 when no attachments are provided", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AA-EMP-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-aaemp-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `aaemp-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `No Files ${u}`,
      });

      const cookies = await loginAs(`hod-aaemp-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .post(`/api/posts/${post.id}/attachments`)
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should allow author to add attachments → 201", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AA-AU-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-aa-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `aa-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Attach ${u}`,
      });

      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({
          url: "https://cloudinary.com/post-attachments/new.jpg",
        });

      const cookies = await loginAs(`hod-aa-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .post(`/api/posts/${post.id}/attachments`)
        .set("Cookie", cookies)
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attachments.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject when exceeding max attachments → 400", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AA-MX-${u}` });
      const hod = await createTeacherWithInfo(dept.id, {
        email: `hod-aamx-${u}@test.com`,
        password: "Pass@1234",
      });
      await assignHOD(dept.id, hod.id);
      const channel = await createChannel(dept.serverId, {
        name: `aamx-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, hod.id, {
        title: `Max Att ${u}`,
      });

      // Pre-add 2 attachments
      await createPostAttachment(post.id);
      await createPostAttachment(post.id);

      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({
          url: "https://cloudinary.com/post-attachments/extra.jpg",
        });

      const cookies = await loginAs(`hod-aamx-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .post(`/api/posts/${post.id}/attachments`)
        .set("Cookie", cookies)
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "a.jpg",
          contentType: "image/jpeg",
        })
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "b.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject non-author → 403", async () => {
      const u = uid();
      const dept = await createDepartment({ code: `AA-NA-${u}` });
      const author = await createTeacherWithInfo(dept.id, {
        email: `auth-aana-${u}@test.com`,
      });
      const other = await createTeacherWithInfo(dept.id, {
        email: `oth-aana-${u}@test.com`,
        password: "Pass@1234",
      });
      const channel = await createChannel(dept.serverId, {
        name: `aana-${u}`,
        type: "GENERAL",
      });
      const post = await createPost(channel.id, author.id, {
        title: `Others Att ${u}`,
      });

      jest
        .spyOn(cloudinaryService, "uploadImage")
        .mockResolvedValue({
          url: "https://cloudinary.com/post-attachments/x.jpg",
        });

      const cookies = await loginAs(`oth-aana-${u}@test.com`, "Pass@1234");
      const res = await request(app)
        .post(`/api/posts/${post.id}/attachments`)
        .set("Cookie", cookies)
        .attach("attachments", VALID_JPEG_BUFFER, {
          filename: "x.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
