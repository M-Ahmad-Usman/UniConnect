import "dotenv/config";
import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { initializeSocket, getIO } from "./socket/index.js";
import { captureException } from "./config/telemetry.js";
import { getModuleLogger } from "./config/logger.js";

const server = http.createServer(app);
const serverLogger = getModuleLogger("server");

const REQUEST_TIMEOUT_MS = 30_000;
const HEADERS_TIMEOUT_MS = 10_000;
const KEEP_ALIVE_TIMEOUT_MS = 5_000;

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.timeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;

// ─── Socket.IO ──────────────────────────────────────────────────────────────
initializeSocket(server);

server.listen(env.PORT, () => {
  serverLogger.info({
    port: env.PORT,
    environment: env.NODE_ENV,
  }, "UniConnect server started");
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;

const gracefulShutdown = async (signal: string) => {
  serverLogger.warn({ signal }, "Shutdown signal received");

  // Force exit if graceful shutdown takes too long
  const forceExit = setTimeout(() => {
    serverLogger.fatal("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  const socketIO = getIO();
  if (socketIO) {
    socketIO.close();
  }
  server.close(async () => {
    await prisma.$disconnect();
    serverLogger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ─── Process Error Handlers ─────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  serverLogger.fatal({ err: reason }, "Unhandled rejection");
  captureException(reason, { source: "unhandledRejection" });
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  serverLogger.fatal({ err: error }, "Uncaught exception");
  captureException(error, { source: "uncaughtException" });
  process.exit(1);
});
