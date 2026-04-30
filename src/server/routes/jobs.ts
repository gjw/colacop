import { Router } from "express";
import type { Kysely } from "kysely";
import type { Database } from "../../db/schema.js";

export function createJobsRouter(db: Kysely<Database>): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const lifecycle = req.query["lifecycle"];
    let query = db
      .selectFrom("jobs")
      .selectAll()
      .orderBy("updated_at", "desc")
      .limit(200);
    if (typeof lifecycle === "string" && lifecycle.length > 0) {
      query = query.where("lifecycle", "=", lifecycle as never);
    }
    const rows = await query.execute();
    res.json({ jobs: rows });
  });

  router.get("/:id", async (req, res) => {
    const idStr = req.params["id"];
    const id = idStr ? Number(idStr) : NaN;
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const job = await db
      .selectFrom("jobs")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!job) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const layer1 = await db
      .selectFrom("layer1_results")
      .selectAll()
      .where("job_id", "=", id)
      .orderBy("id")
      .execute();
    const layer2 = await db
      .selectFrom("layer2_results")
      .selectAll()
      .where("job_id", "=", id)
      .orderBy("id")
      .execute();
    res.json({ job, layer1, layer2 });
  });

  return router;
}
