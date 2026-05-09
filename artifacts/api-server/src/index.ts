import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "./db";
import { seedDefaultUsers } from "./seed";

const port = Number(process.env["PORT"] ?? "3000");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env["PORT"]}"`);
}

if (process.env["NODE_ENV"] === "production" && !process.env["SESSION_SECRET"]) {
  throw new Error(
    "SESSION_SECRET is required in production. " +
    "Set SESSION_SECRET in your Render environment variables."
  );
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, host: "0.0.0.0" }, "Server listening");
  seedDefaultUsers();
});

server.on("error", (err) => {
  logger.error({ err }, "Fatal server error");
  process.exit(1);
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received, closing server");
  server.close(async () => {
    try {
      await pool.end();
      logger.info("Database pool closed");
    } catch (err) {
      logger.error({ err }, "Error closing database pool");
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
