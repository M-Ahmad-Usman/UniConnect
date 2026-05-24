import { prisma, prismaPool } from "../src/config/prisma.js";
import { resetIO } from "../src/socket/index.js";

afterAll(async () => {
  resetIO();
  await prisma.$disconnect();
  await prismaPool.end();
});
