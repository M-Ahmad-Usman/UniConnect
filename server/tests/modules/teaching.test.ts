import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createClass,
  createCourse,
  createDepartment,
  createProgram,
  createTeacherWithInfo,
  createTeachesRecord,
  createUser,
  loginAs,
} from "../helpers/factory.js";

beforeAll(async () => resetDB());

describe("GET /api/teaching/me", () => {
  it("returns active and paginated historical assignments for the authenticated teacher", async () => {
    const suffix = Date.now();
    const department = await createDepartment({ code: `TCH-${suffix.toString(36)}` });
    const program = await createProgram(department.id);
    const klass = await createClass(program.id);
    const course = await createCourse(department.id, { code: `TC-${suffix.toString(36)}` });
    const teacher = await createTeacherWithInfo(department.id, {
      email: `my-teaching-${suffix}@test.com`,
      password: "Pass@1234",
    });
    const assignment = await createTeachesRecord(teacher.id, course.id, klass.id);
    await prisma.teachingAssignmentHistory.create({
      data: {
        teacherId: teacher.id,
        courseId: course.id,
        classId: klass.id,
        channelId: assignment.channelId,
        semesterNumber: 1,
        assignedAt: assignment.assignedAt,
        endedBy: teacher.id,
        endReason: "REPLACED",
      },
    });

    const response = await request(app)
      .get("/api/teaching/me")
      .query({ historyPage: 1, historyLimit: 1 })
      .set("Cookie", await loginAs(teacher.email, "Pass@1234"));

    expect(response.status).toBe(200);
    expect(response.body.data.active).toHaveLength(1);
    expect(response.body.data.active[0]).toEqual(
      expect.objectContaining({ course: expect.objectContaining({ code: course.code }) }),
    );
    expect(response.body.data.history).toHaveLength(1);
    expect(response.body.data.history[0].endReason).toBe("REPLACED");
    expect(response.body.data.historyPagination).toEqual(
      expect.objectContaining({ page: 1, limit: 1, total: 1, totalPages: 1 }),
    );
  });

  it("rejects non-teachers", async () => {
    const student = await createUser({
      email: `teaching-denied-${Date.now()}@test.com`,
      password: "Pass@1234",
      userType: "STUDENT",
    });
    const response = await request(app)
      .get("/api/teaching/me")
      .set("Cookie", await loginAs(student.email, "Pass@1234"));
    expect(response.status).toBe(403);
  });
});
