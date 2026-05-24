import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createUser,
  createDepartment,
  createProgram,
  createDiscipline,
  createDegreeLevelIfNeeded,
  loginAs,
} from "../helpers/factory.js";

beforeAll(async () => {
  await resetDB();
});

describe("Module 7 - Academic Lookup and Program Admin Endpoints", () => {
  it("should list degree levels for authenticated users", async () => {
    const user = await createUser({
      email: `degree-level-user-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
    const cookies = await loginAs(user.email, "Pass@1234");

    const res = await request(app)
      .get("/api/degree-levels")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: degreeLevel.id, level: "Bachelors" })])
    );
  });

  it("should allow admin to rename a discipline", async () => {
    const admin = await createUser({
      email: `admin-disc-update-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const discipline = await createDiscipline({ name: `Rename-Me-${Date.now()}` });
    const cookies = await loginAs(admin.email, "Pass@1234");

    const res = await request(app)
      .patch(`/api/disciplines/${discipline.id}`)
      .set("Cookie", cookies)
      .send({ name: `Renamed-${Date.now()}` });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(discipline.id);
    expect(res.body.data.name).toContain("Renamed-");
  });

  it("should list and fetch program detail through /api/programs", async () => {
    const admin = await createUser({
      email: `admin-program-list-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const dept = await createDepartment({ code: `M7-PL-${Date.now().toString().slice(-5)}` });
    const program = await createProgram(dept.id, { code: `M7PL-${Date.now().toString().slice(-5)}` });
    const cookies = await loginAs(admin.email, "Pass@1234");

    const listRes = await request(app)
      .get("/api/programs")
      .query({ departmentId: dept.id, search: program.code })
      .set("Cookie", cookies);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: program.id, code: program.code })])
    );
    expect(listRes.body.pagination).toBeDefined();

    const detailRes = await request(app)
      .get(`/api/programs/${program.id}`)
      .set("Cookie", cookies);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.department.id).toBe(dept.id);
    expect(detailRes.body.data._count).toBeDefined();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Module 3 - Department & Program Management", () => {
  // ─── Discipline Endpoints ──────────────────────────────────────────────

  describe("POST /api/disciplines", () => {
    it("should allow admin to create a discipline", async () => {
      const admin = await createUser({
        email: "admin-disc-create@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({ name: "Computer Science" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe("Computer Science");
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-disc-create@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({ name: "Physics" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate discipline name", async () => {
      const admin = await createUser({
        email: "admin-disc-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const uniqueName = `Duplicate-Disc-${Date.now()}`;

      await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({ name: uniqueName });

      const res = await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({ name: uniqueName });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 400 for missing name", async () => {
      const admin = await createUser({
        email: "admin-disc-noname@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should trim discipline name input", async () => {
      const admin = await createUser({
        email: "admin-disc-trim@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/disciplines")
        .set("Cookie", cookies)
        .send({ name: "  Data Science  " });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Data Science");
    });
  });

  describe("GET /api/disciplines", () => {
    it("should return all disciplines", async () => {
      const user = await createUser({
        email: "user-disc-list@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get("/api/disciplines")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── Department Endpoints ─────────────────────────────────────────────

  describe("POST /api/departments", () => {
    it("should allow admin to create department with auto-created server and announcements channel", async () => {
      const admin = await createUser({
        email: "admin-dept-create@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: "Computer Science", code: "CS-M3-1" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe("Computer Science");
      expect(res.body.data.code).toBe("CS-M3-1");
      expect(res.body.data.serverId).toBeDefined();

      // Verify server auto-created
      const server = await prisma.server.findUnique({
        where: { id: res.body.data.serverId },
      });
      expect(server).not.toBeNull();
      expect(server!.type).toBe("DEPARTMENT");
      expect(server!.name).toBe("Computer Science");

      // Verify #announcements channel auto-created
      const channel = await prisma.channel.findFirst({
        where: {
          serverId: res.body.data.serverId,
          name: "announcements",
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.type).toBe("ANNOUNCEMENT");
      expect(channel!.isAutoCreated).toBe(true);
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-dept-create@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: "Physics", code: "PHY-M3" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate department code", async () => {
      const admin = await createUser({
        email: "admin-dept-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");
      const uniqueCode = `DUP-${Date.now()}`;

      await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: `Dept One ${Date.now()}`, code: uniqueCode });

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: `Dept Two ${Date.now()}`, code: uniqueCode });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 400 for missing required fields", async () => {
      const admin = await createUser({
        email: "admin-dept-nofields@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate department name", async () => {
      const admin = await createUser({
        email: "admin-dept-dupname@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");
      const uniqueName = `Dup Name ${Date.now()}`;

      await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: uniqueName, code: `DN1-${Date.now()}` });

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: uniqueName, code: `DN2-${Date.now()}` });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 401 for unauthenticated request", async () => {
      const res = await request(app)
        .post("/api/departments")
        .send({ name: "No Auth Dept", code: "NOAUTH" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should trim department name and code input", async () => {
      const admin = await createUser({
        email: "admin-dept-trim@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments")
        .set("Cookie", cookies)
        .send({ name: "  Software Engineering  ", code: "  SE-M3-TRIM  " });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Software Engineering");
      expect(res.body.data.code).toBe("SE-M3-TRIM");
    });
  });

  describe("GET /api/departments", () => {
    it("should return all departments", async () => {
      const user = await createUser({
        email: "user-dept-list@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get("/api/departments")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/departments/:id", () => {
    it("should return department details with HOD info and program count", async () => {
      const user = await createUser({
        email: "user-dept-detail@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const dept = await createDepartment({ code: "CS-M3-DETAIL" });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get(`/api/departments/${dept.id}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dept.id);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.code).toBe("CS-M3-DETAIL");
      expect(res.body.data._count).toBeDefined();
      expect(res.body.data._count.programs).toBeDefined();
    });

    it("should return 404 for non-existent department", async () => {
      const user = await createUser({
        email: "user-dept-404@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get("/api/departments/99999")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PATCH /api/departments/:id", () => {
    it("should allow admin to update department", async () => {
      const admin = await createUser({
        email: "admin-dept-update@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-UPD" });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/departments/${dept.id}`)
        .set("Cookie", cookies)
        .send({ name: "Updated Department Name" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Department Name");

      // Verify server name is synced
      const server = await prisma.server.findUnique({
        where: { id: dept.serverId },
      });
      expect(server!.name).toBe("Updated Department Name");
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-dept-update@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const dept = await createDepartment({ code: "CS-M3-UPD-NA" });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/departments/${dept.id}`)
        .set("Cookie", cookies)
        .send({ name: "Should Fail" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent department", async () => {
      const admin = await createUser({
        email: "admin-dept-upd-404@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/departments/99999")
        .set("Cookie", cookies)
        .send({ name: "Nope" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 409 for duplicate code on update", async () => {
      const admin = await createUser({
        email: "admin-dept-upd-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept1 = await createDepartment({ code: "CS-M3-UPD1" });
      const dept2 = await createDepartment({ code: "CS-M3-UPD2" });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/departments/${dept2.id}`)
        .set("Cookie", cookies)
        .send({ code: "CS-M3-UPD1" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 400 when no fields provided", async () => {
      const admin = await createUser({
        email: "admin-dept-upd-empty@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-EMPTY" });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch(`/api/departments/${dept.id}`)
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Program Endpoints ────────────────────────────────────────────────

  describe("POST /api/departments/:id/programs", () => {
    it("should create program and auto-create program channel in department server", async () => {
      const admin = await createUser({
        email: "admin-prog-create@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PROG" });
      const discipline = await createDiscipline({ name: `CS-Prog-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-M3-1",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toBe("BSCS-M3-1");
      expect(res.body.data.semesters).toBe(8);
      expect(res.body.data.departmentId).toBe(dept.id);
      expect(res.body.data.discipline.id).toBe(discipline.id);
      expect(res.body.data.degreeLevel.id).toBe(degreeLevel.id);

      // Verify program channel auto-created in department server
      const channel = await prisma.channel.findFirst({
        where: {
          serverId: dept.serverId,
          name: "BSCS-M3-1",
          programId: res.body.data.id,
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.type).toBe("PROGRAM");
      expect(channel!.isAutoCreated).toBe(true);
    });

    it("should return 409 for duplicate department+discipline+degreeLevel combination", async () => {
      const admin = await createUser({
        email: "admin-prog-dup@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PDUP" });
      const discipline = await createDiscipline({ name: `CS-ProgDup-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-DUP-1",
        });

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 6,
          code: "BSCS-DUP-2",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });

    it("should return 404 for non-existent department", async () => {
      const admin = await createUser({
        email: "admin-prog-nodept@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const discipline = await createDiscipline({ name: `CS-NoDept-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments/99999/programs")
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-NODEPT-1",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent discipline", async () => {
      const admin = await createUser({
        email: "admin-prog-nodisc@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-NODISC" });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: 99999,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-NODISC-1",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 404 for non-existent degree level", async () => {
      const admin = await createUser({
        email: "admin-prog-nodeg@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-NODEG" });
      const discipline = await createDiscipline({ name: `CS-NoDeg-${Date.now()}` });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: 99999,
          semesters: 8,
          code: "BSCS-NODEG-1",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-prog-create@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .post("/api/departments/1/programs")
        .set("Cookie", cookies)
        .send({
          disciplineId: 1,
          degreeLevelId: 1,
          semesters: 8,
          code: "BSCS-NOADMIN",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should trim program code input and use trimmed channel name", async () => {
      const admin = await createUser({
        email: "admin-prog-trim@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PTRIM" });
      const discipline = await createDiscipline({ name: `CS-ProgTrim-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "  BSCS-TRIM-1  ",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("BSCS-TRIM-1");

      const channel = await prisma.channel.findFirst({
        where: {
          serverId: dept.serverId,
          programId: res.body.data.id,
          isAutoCreated: true,
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.name).toBe("BSCS-TRIM-1");
    });
  });

  describe("GET /api/departments/:id/programs", () => {
    it("should list programs in a department", async () => {
      const admin = await createUser({
        email: "admin-prog-list@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PLIST" });
      const discipline = await createDiscipline({ name: `CS-ProgList-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      // Create a program first via API
      await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-LIST-1",
        });

      const res = await request(app)
        .get(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].discipline).toBeDefined();
      expect(res.body.data[0].degreeLevel).toBeDefined();
    });

    it("should return 404 for non-existent department", async () => {
      const user = await createUser({
        email: "user-prog-list-404@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(user.email, "Pass@1234");

      const res = await request(app)
        .get("/api/departments/99999/programs")
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Program Update Endpoint ──────────────────────────────────────────

  describe("PATCH /api/programs/:id", () => {
    it("should allow admin to update program", async () => {
      const admin = await createUser({
        email: "admin-prog-update@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PUPD" });
      const discipline = await createDiscipline({ name: `CS-ProgUpd-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const createRes = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "BSCS-UPD-1",
        });

      const programId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/programs/${programId}`)
        .set("Cookie", cookies)
        .send({ semesters: 6 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.semesters).toBe(6);
    });

    it("should return 404 for non-existent program", async () => {
      const admin = await createUser({
        email: "admin-prog-upd-404@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/programs/99999")
        .set("Cookie", cookies)
        .send({ semesters: 6 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 for non-admin", async () => {
      const student = await createUser({
        email: "student-prog-update@test.com",
        password: "Pass@1234",
        userType: "STUDENT",
      });
      const cookies = await loginAs(student.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/programs/1")
        .set("Cookie", cookies)
        .send({ semesters: 6 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when no fields provided", async () => {
      const admin = await createUser({
        email: "admin-prog-upd-empty@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const cookies = await loginAs(admin.email, "Pass@1234");

      const res = await request(app)
        .patch("/api/programs/1")
        .set("Cookie", cookies)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should allow updating program code", async () => {
      const admin = await createUser({
        email: "admin-prog-upd-code@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PCODE" });
      const discipline = await createDiscipline({ name: `CS-ProgCode-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      const createRes = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: discipline.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "OLD-CODE-1",
        });

      const programId = createRes.body.data.id;
      const newCode = "NEW-CODE-1";

      const res = await request(app)
        .patch(`/api/programs/${programId}`)
        .set("Cookie", cookies)
        .send({ code: newCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(newCode);

      // Verify channel name is synced with new program code
      const channel = await prisma.channel.findFirst({
        where: {
          serverId: dept.serverId,
          programId,
          isAutoCreated: true,
        },
      });
      expect(channel).not.toBeNull();
      expect(channel!.name).toBe(newCode);
    });

    it("should return 409 for duplicate program code", async () => {
      const admin = await createUser({
        email: "admin-prog-dupcode@test.com",
        password: "Pass@1234",
        userType: "ADMIN",
      });
      const dept = await createDepartment({ code: "CS-M3-PDCODE" });
      const disc1 = await createDiscipline({ name: `Disc-DupC1-${Date.now()}` });
      const disc2 = await createDiscipline({ name: `Disc-DupC2-${Date.now()}` });
      const degreeLevel = await createDegreeLevelIfNeeded("Bachelors");
      const cookies = await loginAs(admin.email, "Pass@1234");

      await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: disc1.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "DUPCODE-1",
        });

      const res = await request(app)
        .post(`/api/departments/${dept.id}/programs`)
        .set("Cookie", cookies)
        .send({
          disciplineId: disc2.id,
          degreeLevelId: degreeLevel.id,
          semesters: 8,
          code: "DUPCODE-1",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT");
    });
  });
});
