import { Router } from "express";
import type { Kysely } from "kysely";
import type { Database } from "../../db/schema.js";
import { isOverride } from "../../core/recommendation.js";

export function createDecisionsExportRouter(db: Kysely<Database>): Router {
  const router = Router();

  // NDJSON feed: one decision per line, joined with the job stem.
  // Downstream workflow engines poll this with `since` (ISO-8601) to ingest
  // newly-recorded decisions.
  router.get("/decisions.ndjson", async (req, res) => {
    const sinceRaw = req.query["since"];
    let since: Date | null = null;
    if (typeof sinceRaw === "string" && sinceRaw.length > 0) {
      const parsed = new Date(sinceRaw);
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ error: "invalid 'since' (use ISO-8601)" });
        return;
      }
      since = parsed;
    }

    let query = db
      .selectFrom("decisions")
      .innerJoin("jobs", "jobs.id", "decisions.job_id")
      .select([
        "decisions.id as decision_id",
        "decisions.job_id",
        "jobs.stem",
        "decisions.outcome",
        "decisions.note",
        "decisions.cited_findings",
        "decisions.missing",
        "decisions.recommendation",
        "decisions.decided_at",
        "decisions.decided_by",
      ])
      .orderBy("decisions.decided_at", "asc")
      .limit(1000);

    if (since !== null) {
      query = query.where("decisions.decided_at", ">", since);
    }

    const rows = await query.execute();

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    for (const row of rows) {
      const enriched = {
        ...row,
        is_override: isOverride(row.outcome, row.recommendation),
      };
      res.write(`${JSON.stringify(enriched)}\n`);
    }
    res.end();
  });

  return router;
}
