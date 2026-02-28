import "dotenv/config";
import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { initializeSocket, getIO } from "./socket/index.js";

const server = http.createServer(app);

// ─── Socket.IO ──────────────────────────────────────────────────────────────
initializeSocket(server);

server.listen(env.PORT, () => {
  console.log(
    `🚀 UniConnect server running on port ${env.PORT} [${env.NODE_ENV}]`
  );
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  const socketIO = getIO();
  if (socketIO) {
    socketIO.close();
  }
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
