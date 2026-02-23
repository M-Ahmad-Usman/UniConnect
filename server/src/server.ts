import "dotenv/config";
import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(
    `🚀 UniConnect server running on port ${env.PORT} [${env.NODE_ENV}]`
  );
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
