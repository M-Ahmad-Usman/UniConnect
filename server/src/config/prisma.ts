import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

export const prismaPool = new Pool({
  connectionString: env.DATABASE_URL,
});

const adapter = new PrismaPg(prismaPool);

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
