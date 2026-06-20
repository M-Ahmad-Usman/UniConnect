import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { getModuleLogger } from "./logger.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

const prismaLogger = getModuleLogger("prisma");

prisma.$on("warn", (event) => {
  prismaLogger.warn({ message: event.message, target: event.target }, "Prisma warning");
});

prisma.$on("error", (event) => {
  prismaLogger.error({ message: event.message, target: event.target }, "Prisma error");
});
