import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/config/prisma.js";
import { resetDB } from "../helpers/db.helper.js";
import {
  createDepartment,
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
    email: `staff-admin-${suffix}@test.com`,
    password: "Pass@1234",
    userType: "ADMIN",
  });
  return { admin, cookies: await loginAs(admin.email, "Pass@1234") };
}

beforeEach(async () => {
  await resetDB();
  await seedRolesAndPermissions();
});

describe("Staff roles", () => {
  it("allows active admin staff to access admin routes and denies non-admin staff", async () => {
    const { cookies } = await createAdminSession();
    const staff = await createUser({
      email: `plain-staff-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const staffCookies = await loginAs(staff.email, "Pass@1234");

    const adminRes = await request(app).get("/api/admin/stats").set("Cookie", cookies);
    expect(adminRes.status).toBe(200);

    const staffRes = await request(app).get("/api/admin/stats").set("Cookie", staffCookies);
    expect(staffRes.status).toBe(403);
  });

  it("assigns and revokes department-scoped staff roles", async () => {
    const { admin, cookies } = await createAdminSession();
    const staff = await createUser({
      email: `enrollment-staff-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const department = await createDepartment({ code: `ENR-${uid()}`, creatorId: admin.id });

    const assignRes = await request(app)
      .post("/api/roles/staff-assignments")
      .set("Cookie", cookies)
      .send({
        userPublicId: staff.publicId,
        role: "enrollment_officer",
        departmentId: department.id,
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data).toMatchObject({
      role: "enrollment_officer",
      scopeType: "department",
      departmentId: department.id,
      state: "ACTIVE",
      user: { publicId: staff.publicId },
    });

    const revokeRes = await request(app)
      .delete(`/api/roles/staff-assignments/${assignRes.body.data.assignmentPublicId}`)
      .set("Cookie", cookies);

    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.data).toMatchObject({
      role: "enrollment_officer",
      state: "REVOKED",
    });
  });

  it("exposes enrollment officer through role workspace options and revokable lists", async () => {
    const { admin, cookies } = await createAdminSession();
    const staff = await createUser({
      email: `workspace-staff-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });
    const department = await createDepartment({ code: `EO-${uid()}`, creatorId: admin.id });

    const rolesRes = await request(app).get("/api/roles/assignable").set("Cookie", cookies);
    expect(rolesRes.status).toBe(200);
    expect(rolesRes.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "enrollment_officer",
          targetUserTypes: ["STAFF"],
          scopeKind: "department",
        }),
      ]),
    );

    const scopesRes = await request(app)
      .get("/api/roles/assignable-scopes")
      .query({ role: "enrollment_officer" })
      .set("Cookie", cookies);
    expect(scopesRes.status).toBe(200);
    expect(scopesRes.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: department.id, disabled: false }),
      ]),
    );

    const usersRes = await request(app)
      .get("/api/roles/assignable-users")
      .query({ role: "enrollment_officer", scopeId: department.id })
      .set("Cookie", cookies);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ publicId: staff.publicId, userType: "STAFF" }),
      ]),
    );

    const assignRes = await request(app)
      .post("/api/roles/staff-assignments")
      .set("Cookie", cookies)
      .send({
        userPublicId: staff.publicId,
        role: "enrollment_officer",
        departmentId: department.id,
      });
    expect(assignRes.status).toBe(201);

    const usersAfterAssignRes = await request(app)
      .get("/api/roles/assignable-users")
      .query({ role: "enrollment_officer", scopeId: department.id })
      .set("Cookie", cookies);
    expect(usersAfterAssignRes.status).toBe(200);
    expect(usersAfterAssignRes.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ publicId: staff.publicId })]),
    );

    const revokableRes = await request(app)
      .get("/api/roles/revokable")
      .query({ role: "enrollment_officer", scopeId: department.id })
      .set("Cookie", cookies);
    expect(revokableRes.status).toBe(200);
    expect(revokableRes.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "enrollment_officer",
          user: expect.objectContaining({ publicId: staff.publicId }),
          revokePayload: {
            assignmentPublicId: assignRes.body.data.assignmentPublicId,
            assignmentType: "staff",
          },
        }),
      ]),
    );

    const revokeRes = await request(app)
      .delete(`/api/roles/staff-assignments/${assignRes.body.data.assignmentPublicId}`)
      .set("Cookie", cookies);
    expect(revokeRes.status).toBe(200);
  });

  it("transfers the single active admin role atomically", async () => {
    const { admin, cookies } = await createAdminSession();
    const nextAdmin = await createUser({
      email: `next-admin-${uid()}@test.com`,
      password: "Pass@1234",
      userType: "STAFF",
    });

    const transferRes = await request(app)
      .post("/api/roles/admin/transfer")
      .set("Cookie", cookies)
      .send({ userPublicId: nextAdmin.publicId });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.data).toMatchObject({
      role: "admin",
      scopeType: "global",
      state: "ACTIVE",
      user: { publicId: nextAdmin.publicId },
    });

    const activeAdmins = await prisma.staffRoleAssignment.findMany({
      where: {
        revokedAt: null,
        role: { name: "admin", scopeType: "GLOBAL" },
      },
      select: { userId: true },
    });

    expect(activeAdmins).toEqual([{ userId: nextAdmin.id }]);

    const oldAdminRes = await request(app).get("/api/admin/stats").set("Cookie", cookies);
    expect(oldAdminRes.status).toBe(403);

    const nextAdminCookies = await loginAs(nextAdmin.email, "Pass@1234");
    const nextAdminRes = await request(app).get("/api/admin/stats").set("Cookie", nextAdminCookies);
    expect(nextAdminRes.status).toBe(200);
    expect(admin.userType).toBe("STAFF");
  });
});
