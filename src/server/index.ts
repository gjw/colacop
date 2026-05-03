import path from "node:path";
try {
  process.loadEnvFile();
} catch {
  // .env absent — rely on shell/PM2 env
}
import express from "express";
import { createDb, createPool } from "../db/kysely.js";
import type { Database } from "../db/schema.js";
import { createFilesRouter } from "./routes/files.js";
import { createJobsRouter } from "./routes/jobs.js";
import { createUploadRouter } from "./routes/upload.js";

async function main(): Promise<void> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const port = Number(process.env["PORT"] ?? "3000");
  const incomingDir = path.resolve(
    process.env["INCOMING_DIR"] ?? "./data/incoming",
  );
  const fixturesDir = path.resolve(
    process.env["FIXTURES_DIR"] ?? "./fixtures/pairs",
  );
  const webDist = path.resolve("dist/web");

  const pool = createPool(databaseUrl);
  const db = createDb<Database>(pool);

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/jobs", createJobsRouter(db));
  app.use("/api/upload", createUploadRouter(incomingDir));
  app.use("/api/files", createFilesRouter(incomingDir));

  app.use("/fixtures", express.static(fixturesDir));

  app.use(express.static(webDist));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(webDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  app.listen(port, () => {
    console.log(`[server] listening on :${port}`);
  });
}

await main();
