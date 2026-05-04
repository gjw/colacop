import type { Request, Response } from "express";
import type { Kysely } from "kysely";
import { z } from "zod";
import type {
  CitedFinding,
  Database,
  MissingItem,
} from "../../db/schema.js";
import { computeRecommendation } from "../../core/recommendation.js";

const citedFindingSchema = z.object({
  layer: z.union([z.literal(1), z.literal(2)]),
  id: z.number().int().positive(),
});

const missingItemSchema = z.enum([
  "abv_substantiation",
  "net_contents_clarity",
  "address_verification",
  "class_type_designation",
  "other",
]);

const approveBodySchema = z.object({
  outcome: z.literal("approve"),
  note: z.string().optional(),
});

const rejectBodySchema = z.object({
  outcome: z.literal("reject"),
  cited_findings: z.array(citedFindingSchema).min(1),
  note: z.string().optional(),
});

const sendBackBodySchema = z
  .object({
    outcome: z.literal("send_back"),
    missing: z.array(missingItemSchema).min(1),
    note: z.string().optional(),
  })
  .refine(
    (b) =>
      !b.missing.includes("other") ||
      (typeof b.note === "string" && b.note.trim().length > 0),
    {
      message: "note is required when 'other' is in missing",
      path: ["note"],
    },
  );

const decisionBodySchema = z.discriminatedUnion("outcome", [
  approveBodySchema,
  rejectBodySchema,
  sendBackBodySchema,
]);

export function createDecisionHandler(
  db: Kysely<Database>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
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

    const existing = await db
      .selectFrom("decisions")
      .select("id")
      .where("job_id", "=", id)
      .executeTakeFirst();
    if (existing) {
      res.status(409).json({ error: "decision already recorded" });
      return;
    }

    const parsed = decisionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "invalid body", details: parsed.error.issues });
      return;
    }
    const body = parsed.data;

    let citedFindings: CitedFinding[] | null = null;
    let missing: MissingItem[] | null = null;

    const layer1Rows = await db
      .selectFrom("layer1_results")
      .select(["id", "verdict"])
      .where("job_id", "=", id)
      .execute();
    const layer2Rows = await db
      .selectFrom("layer2_results")
      .select(["id", "verdict"])
      .where("job_id", "=", id)
      .execute();

    if (body.outcome === "reject") {
      const layer1Ids = new Set(layer1Rows.map((r) => r.id));
      const layer2Ids = new Set(layer2Rows.map((r) => r.id));
      for (const c of body.cited_findings) {
        const ok = c.layer === 1 ? layer1Ids.has(c.id) : layer2Ids.has(c.id);
        if (!ok) {
          res.status(400).json({
            error: `cited finding layer=${c.layer} id=${c.id} does not belong to job ${id}`,
          });
          return;
        }
      }
      citedFindings = body.cited_findings;
    } else if (body.outcome === "send_back") {
      missing = body.missing;
    }

    const recommendation = computeRecommendation(
      layer1Rows.map((r) => r.verdict),
      layer2Rows.map((r) => r.verdict),
    );

    const inserted = await db
      .insertInto("decisions")
      .values({
        job_id: id,
        outcome: body.outcome,
        note: body.note ?? null,
        cited_findings:
          citedFindings === null ? null : JSON.stringify(citedFindings),
        missing: missing === null ? null : JSON.stringify(missing),
        recommendation,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    res.status(201).json({ decision: inserted });
  };
}
