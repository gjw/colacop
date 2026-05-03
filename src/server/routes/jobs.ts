import path from "node:path";
import { promises as fs } from "node:fs";
import { Router } from "express";
import type { Kysely, Selectable } from "kysely";
import type { Database, JobsTable } from "../../db/schema.js";
import { applicationDataSchema, type ApplicationData } from "../../core/schemas.js";

type JobRow = Selectable<JobsTable>;

function imageUrl(imagePath: string | null): string | null {
  if (imagePath === null) return null;
  return `/api/files/${path.basename(imagePath)}`;
}

function decorate(job: JobRow): JobRow & { image_url: string | null } {
  return { ...job, image_url: imageUrl(job.image_path) };
}

async function loadApplication(
  applicationPath: string,
): Promise<ApplicationData | null> {
  try {
    const raw = await fs.readFile(applicationPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return applicationDataSchema.parse(parsed);
  } catch {
    return null;
  }
}

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
    res.json({ jobs: rows.map(decorate) });
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
    const application =
      job.application_path !== null
        ? await loadApplication(job.application_path)
        : null;
    res.json({ job: decorate(job), layer1, layer2, application });
  });

  return router;
}
