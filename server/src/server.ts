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
  console.warn("[SERVER] UniConnect server started", {
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;

const gracefulShutdown = async (signal: string) => {
  console.warn("[SERVER] Shutdown signal received", { signal });

  // Force exit if graceful shutdown takes too long
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  const socketIO = getIO();
  if (socketIO) {
    socketIO.close();
  }
  server.close(async () => {
    await prisma.$disconnect();
    console.warn("[SERVER] Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Process Error Handlers ─────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
