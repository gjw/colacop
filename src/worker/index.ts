import path from "node:path";
import { promises as fs } from "node:fs";
import { createDb, createPool } from "../db/kysely.js";
import type { Database } from "../db/schema.js";
import { StubLabelProvider } from "../core/providers/stub.js";
import { startWatcher } from "./watcher.js";

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const incomingDir = path.resolve(
    process.env["INCOMING_DIR"] ?? "./data/incoming",
  );
  await fs.mkdir(incomingDir, { recursive: true });

  const pool = createPool(databaseUrl);
  const db = createDb<Database>(pool);
  const provider = new StubLabelProvider();

  const watcher = startWatcher(db, provider, incomingDir);
  console.log(`[worker] watching ${incomingDir}`);

  const shutdown = async (): Promise<void> => {
    await watcher.close();
    await db.destroy();
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

await main();
