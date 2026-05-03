import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
try {
  process.loadEnvFile();
} catch {
  // .env absent — rely on shell/PM2 env
}
import { FileMigrationProvider, Migrator } from "kysely";
import { createDb, createPool } from "../src/db/kysely.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = createPool(databaseUrl);
  const db = createDb<Record<string, never>>(pool);

  const migrationFolder = path.resolve(__dirname, "../src/db/migrations");
  await fs.mkdir(migrationFolder, { recursive: true });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  const direction = process.argv[2] ?? "latest";
  const { error, results } =
    direction === "down"
      ? await migrator.migrateDown()
      : await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.log(`migrated ${result.direction}: ${result.migrationName}`);
    } else if (result.status === "Error") {
      console.error(`failed: ${result.migrationName}`);
    }
  }

  if (error) {
    console.error(error);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
}

await main();
