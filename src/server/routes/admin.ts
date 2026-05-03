import path from "node:path";
import { promises as fs } from "node:fs";
import { Router } from "express";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { Database } from "../../db/schema.js";

export function createAdminRouter(
  db: Kysely<Database>,
  incomingDir: string,
): Router {
  const router = Router();
  const root = path.resolve(incomingDir);

  router.post("/reset", async (_req, res) => {
    try {
      const jobsBefore = await db
        .selectFrom("jobs")
        .select(db.fn.countAll<string>().as("c"))
        .executeTakeFirst();
      const jobsCount = jobsBefore ? Number(jobsBefore.c) : 0;

      await sql`TRUNCATE TABLE jobs, layer1_results, layer2_results RESTART IDENTITY CASCADE`.execute(
        db,
      );

      let filesRemoved = 0;
      try {
        const entries = await fs.readdir(root);
        for (const name of entries) {
          if (name.startsWith(".")) continue;
          const abs = path.join(root, name);
          const stat = await fs.stat(abs);
          if (stat.isFile()) {
            await fs.unlink(abs);
            filesRemoved += 1;
          }
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }

      res.json({ jobsCleared: jobsCount, filesRemoved });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: reason });
    }
  });

  return router;
}
