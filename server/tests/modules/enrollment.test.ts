import request from "supertest";
import { jest } from "@jest/globals";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { emailService } from "../../src/config/email.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  assignHOD,
  createCourse,
  createDepartment,
  createProgram,
  createClass,
  createCurriculum,
  createStudentWithInfo,
  createTeacherWithInfo,
  createUser,
  loginAs,
} from "../helpers/factory.js";

let uidCounter = 0;
function uid(): string {
  uidCounter += 1;
  return uidCounter.toString(36);
}

function rollNumber(): string {
  uidCounter += 1;
  return `22-NTU-CS-${(uidCounter % 100000).toString().padStart(4, "0")}`;
}

async function addFullCurriculum(
  departmentId: number,
  program: { id: number; semesters: number },
  batchYear: number,
) {
  for (let semester = 1; semester <= program.semesters; semester += 1) {
    const course = await createCourse(departmentId, { code: `ENR-${semester}-${uid()}` });
    await createCurriculum(program.id, course.id, semester, batchYear);
  }
}

async function assignEnrollmentOfficer(departmentId: number, userId: number, assignedBy?: number) {
  const role = await prisma.role.upsert({
    where: { name: "enrollment_officer" },
    update: { scopeType: "DEPARTMENT" },
    create: { name: "enrollment_officer", scopeType: "DEPARTMENT" },
  });

  return prisma.staffRoleAssignment.create({
    data: {
      userId,
      roleId: role.id,
      scopeType: "DEPARTMENT",
      departmentId,
      assignedBy: assignedBy ?? null,
    },
  });
}

beforeAll(async () => {
  await resetDB();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Enrollment workspace API", () => {
  it("returns only assigned departments in enrollment bootstrap", async () => {
    const admin = await createUser({
      email: `enrollment-admin-bootstrap-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const officer = await createUser({
      email: `enrollment-officer-bootstrap-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const assignedDepartment = await createDepartment({ code: `ENR-BOOT-A-${uid()}` });
    const otherDepartment = await createDepartment({ code: `ENR-BOOT-B-${uid()}` });
    await assignEnrollmentOfficer(assignedDepartment.id, officer.id, admin.id);
    const cookies = await loginAs(officer.email, "Pass@1234");

    const res = await request(app).get("/api/enrollment/bootstrap").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.data.isAdmin).toBe(false);
    expect(res.body.data.defaultDepartmentId).toBe(assignedDepartment.id);
    expect(res.body.data.departments).toEqual([
      expect.objectContaining({ id: assignedDepartment.id }),
    ]);
    expect(res.body.data.departments).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: otherDepartment.id })]),
    );
  });

  it("denies HOD access to enrollment workspace APIs", async () => {
    const department = await createDepartment({ code: `ENR-HOD-DENY-${uid()}` });
    const hod = await createTeacherWithInfo(department.id, {
      email: `enrollment-hod-deny-${uid()}@test.com`,
      password: "Pass@1234",
    });
    await assignHOD(department.id, hod.id);
    const cookies = await loginAs(hod.email, "Pass@1234");

    const res = await request(app).get("/api/enrollment/bootstrap").set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SCOPE_FORBIDDEN");
  });

  it("allows an enrollment officer to create a class in an assigned department", async () => {
    const admin = await createUser({
      email: `enrollment-admin-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const officer = await createUser({
      email: `enrollment-officer-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const department = await createDepartment({ code: `ENR-A-${uid()}` });
    const program = await createProgram(department.id, { code: `ENRA${uid()}`, semesters: 2 });
    await addFullCurriculum(department.id, program, 2026);
    await assignEnrollmentOfficer(department.id, officer.id, admin.id);
    const cookies = await loginAs(officer.email, "Pass@1234");

    const res = await request(app)
      .post("/api/enrollment/classes")
      .set("Cookie", cookies)
      .send({
        programId: program.id,
        currentSemester: 1,
        academicYear: 2026,
        admissionYear: 2026,
        section: "A",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.program.department.id).toBe(department.id);
    expect(res.body.data.serverPublicId).toEqual(expect.any(String));
  });

  it("denies enrollment officer writes outside assigned departments", async () => {
    const admin = await createUser({
      email: `enrollment-admin-cross-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const officer = await createUser({
      email: `enrollment-officer-cross-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const ownDepartment = await createDepartment({ code: `ENR-B-${uid()}` });
    const otherDepartment = await createDepartment({ code: `ENR-C-${uid()}` });
    const otherProgram = await createProgram(otherDepartment.id, {
      code: `ENRC${uid()}`,
      semesters: 2,
    });
    await addFullCurriculum(otherDepartment.id, otherProgram, 2026);
    await assignEnrollmentOfficer(ownDepartment.id, officer.id, admin.id);
    const cookies = await loginAs(officer.email, "Pass@1234");

    const res = await request(app)
      .post("/api/enrollment/classes")
      .set("Cookie", cookies)
      .send({
        programId: otherProgram.id,
        currentSemester: 1,
        academicYear: 2026,
        admissionYear: 2026,
        section: "A",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SCOPE_FORBIDDEN");
  });

  it("allows enrollment officer student create, import, and transfer within scope", async () => {
    jest.spyOn(emailService, "sendTempPasswordEmail").mockResolvedValue(undefined);
    const admin = await createUser({
      email: `enrollment-admin-students-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const officer = await createUser({
      email: `enrollment-officer-students-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const department = await createDepartment({ code: `ENR-D-${uid()}` });
    const program = await createProgram(department.id, { code: `ENRD${uid()}`, semesters: 2 });
    const sourceClass = await createClass(program.id, { section: "A" });
    const targetClass = await createClass(program.id, { section: "B" });
    await assignEnrollmentOfficer(department.id, officer.id, admin.id);
    const movingStudent = await createStudentWithInfo(sourceClass.id, department.id, {
      email: `enrollment-moving-${uid()}@test.com`,
    });
    const cookies = await loginAs(officer.email, "Pass@1234");

    const createRes = await request(app)
      .post("/api/enrollment/students")
      .set("Cookie", cookies)
      .send({
        fullName: "Enrollment Student",
        email: `enrollment-created-${uid()}@test.com`,
        phone: "03001234567",
        gender: "MALE",
        classPublicId: targetClass.publicId,
        rollNumber: rollNumber(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.userType).toBe("STUDENT");

    const transferRes = await request(app)
      .post(`/api/enrollment/classes/${targetClass.publicId}/transfers`)
      .set("Cookie", cookies)
      .send({ studentPublicId: movingStudent.publicId });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data.class.publicId).toBe(targetClass.publicId);

    const csv =
      "fullName,email,phone,gender,userType,classPublicId,rollNumber\n" +
      `Imported Student,enrollment-import-${uid()}@test.com,03001234567,FEMALE,STUDENT,${targetClass.publicId},${rollNumber()}\n` +
      `Bad Teacher,enrollment-import-teacher-${uid()}@test.com,03001234567,MALE,TEACHER,${targetClass.publicId},${rollNumber()}\n`;

    const importRes = await request(app)
      .post("/api/enrollment/students/import")
      .set("Cookie", cookies)
      .attach("file", Buffer.from(csv), {
        filename: "students.csv",
        contentType: "text/csv",
      });

    expect(importRes.status).toBe(200);
    expect(importRes.body.data.successful).toBe(1);
    expect(importRes.body.data.failed).toBe(1);
    expect(importRes.body.data.errors[0].message).toContain("STUDENT rows only");
  });

  it("keeps HOD roster visibility but denies enrollment mutations", async () => {
    const department = await createDepartment({ code: `ENR-E-${uid()}` });
    const program = await createProgram(department.id, { code: `ENRE${uid()}`, semesters: 2 });
    const sourceClass = await createClass(program.id, { section: "A" });
    const targetClass = await createClass(program.id, { section: "B" });
    const hod = await createTeacherWithInfo(department.id, {
      email: `enrollment-hod-${uid()}@test.com`,
      password: "Pass@1234",
    });
    await assignHOD(department.id, hod.id);
    const student = await createStudentWithInfo(sourceClass.id, department.id, {
      email: `enrollment-hod-student-${uid()}@test.com`,
    });
    const cookies = await loginAs(hod.email, "Pass@1234");

    const rosterRes = await request(app)
      .get(`/api/classes/${sourceClass.publicId}/students`)
      .set("Cookie", cookies);
    expect(rosterRes.status).toBe(200);

    const candidatesRes = await request(app)
      .get(`/api/classes/${targetClass.publicId}/student-candidates`)
      .set("Cookie", cookies);
    expect(candidatesRes.status).toBe(403);

    const transferRes = await request(app)
      .post(`/api/classes/${targetClass.publicId}/students`)
      .set("Cookie", cookies)
      .send({ studentPublicId: student.publicId });
    expect(transferRes.status).toBe(403);
  });

  it("rejects STAFF rows in the generic admin CSV import", async () => {
    const admin = await createUser({
      email: `enrollment-admin-import-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "ADMIN",
    });
    const cookies = await loginAs(admin.email, "Pass@1234");
    const csv =
      "fullName,email,phone,gender,userType,departmentId,classPublicId,rollNumber,designation\n" +
      `Staff Import,enrollment-staff-import-${uid()}@test.com,03001234567,MALE,STAFF,,,,\n`;

    const res = await request(app)
      .post("/api/users/bulk-import")
      .set("Cookie", cookies)
      .attach("file", Buffer.from(csv), {
        filename: "users.csv",
        contentType: "text/csv",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.successful).toBe(0);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.errors[0].message).toContain("STAFF rows are not supported");
  });
});
