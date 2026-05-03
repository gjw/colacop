import path from "node:path";
import { promises as fs } from "node:fs";
try {
  process.loadEnvFile();
} catch {
  // .env absent — rely on shell/PM2 env
}
import { createDb, createPool } from "../db/kysely.js";
import type { Database } from "../db/schema.js";
import { StubLabelProvider } from "../core/providers/stub.js";
import { GeminiLabelProvider } from "../core/providers/gemini.js";
import type { LabelProvider } from "../core/providers/types.js";
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

  const geminiApiKey = process.env["GEMINI_API_KEY"];
  let provider: LabelProvider;
  if (geminiApiKey !== undefined && geminiApiKey !== "") {
    provider = new GeminiLabelProvider({ apiKey: geminiApiKey });
    console.log("[worker] provider: GeminiLabelProvider");
  } else {
    provider = new StubLabelProvider();
    console.log(
      "[worker] provider: StubLabelProvider (GEMINI_API_KEY not set)",
    );
  }

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
