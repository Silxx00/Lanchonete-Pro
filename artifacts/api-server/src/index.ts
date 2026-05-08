import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env["NODE_ENV"] === "production" && !process.env["SESSION_SECRET"]) {
  throw new Error(
    "SESSION_SECRET environment variable is required in production. " +
    "Set it in your deployment environment secrets."
  );
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, host: "0.0.0.0" }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Fatal server error");
  process.exit(1);
});
