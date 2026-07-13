import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrate";
import { seedAdminUser, seedSampleMachines } from "./lib/seed";

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

async function start() {
  // Schema migrations are fatal on failure: serving requests against a wrong
  // schema would only produce confusing downstream errors.
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, "Database migration failed — refusing to start");
    process.exit(1);
  }

  try {
    await seedAdminUser();
    await seedSampleMachines();
  } catch (err) {
    logger.error({ err }, "Error during startup seeding");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();
