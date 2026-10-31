import { app } from "./app.js";
import { config } from "./config.js";
import { closeDatabase } from "./db.js";

const server = app.listen(config.port, config.host, () => {
  console.log(`ROVER AI API listening on ${config.host}:${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully.`);

  server.close(async (error) => {
    try {
      await closeDatabase();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      console.error("Shutdown error:", closeError);
      process.exit(1);
    }
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));