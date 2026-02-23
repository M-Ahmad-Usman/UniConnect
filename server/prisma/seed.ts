import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { TEMP_PASSWORD_PREFIX } from "../src/shared/constants.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Seed Data ──────────────────────────────────────────────────────────────

const ROLES = [
  "hod",
  "program_director",
  "society_president",
  "society_convenor",
  "cr",
  "moderator",
] as const;

const PERMISSIONS = [
  "post:channel",
  "create:channel",
  "delete:channel",
  "lock:channel",
  "create:society",
  "create:department",
  "create:class",
  "assign:hod",
  "assign:program_director",
  "assign:cr",
  "assign:society_president",
  "assign:society_convenor",
  "assign:moderator",
] as const;

const DEGREE_LEVELS = ["Bachelors", "Masters", "PHD"] as const;

// Map role → permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  hod: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "create:society",
    "create:class",
    "assign:program_director",
    "assign:cr",
    "assign:society_president",
    "assign:society_convenor",
    "assign:moderator",
  ],
  program_director: ["post:channel", "assign:cr"],
  society_president: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:moderator",
  ],
  society_convenor: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:moderator",
    "assign:society_president",
  ],
  cr: [
    "post:channel",
    "create:channel",
    "delete:channel",
    "lock:channel",
    "assign:moderator",
  ],
  moderator: ["post:channel"],
};

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Seed degree levels
  for (const level of DEGREE_LEVELS) {
    await prisma.degreeLevel.upsert({
      where: { level },
      update: {},
      create: { level },
    });
  }
  console.log("  ✅ Degree levels seeded");

  // 2. Seed roles
  for (const roleName of ROLES) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log("  ✅ Roles seeded");

  // 3. Seed permissions
  for (const permName of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: { name: permName },
    });
  }
  console.log("  ✅ Permissions seeded");

  // 4. Seed role-permission mappings
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    for (const permName of permNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
  console.log("  ✅ Role-permission mappings seeded");

  // 5. Seed admin user
  const adminEmail = "admin@uniconnect.com";
  const tempPassword = `${TEMP_PASSWORD_PREFIX}Admin@123`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: "Super Admin",
      email: adminEmail,
      phone: "03000000000",
      passwordHash,
      gender: "MALE",
      userType: "ADMIN",
      departmentId: null,
      isActive: true,
      mustChangePassword: true,
    },
  });
  console.log(`  ✅ Admin user seeded (${adminEmail} / ${tempPassword})`);

  console.log("\n🎉 Seeding complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
