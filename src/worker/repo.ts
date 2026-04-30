import type { Kysely } from "kysely";
import { sql } from "kysely";
import type {
  Database,
  Lifecycle,
} from "../db/schema.js";
import type {
  Layer1FieldResult,
  Layer2FieldResult,
} from "../core/schemas.js";

export interface JobRow {
  id: number;
  stem: string;
  image_path: string | null;
  application_path: string | null;
  lifecycle: Lifecycle;
  failure_reason: string | null;
}

export async function getJobByStem(
  db: Kysely<Database>,
  stem: string,
): Promise<JobRow | undefined> {
  return db
    .selectFrom("jobs")
    .selectAll()
    .where("stem", "=", stem)
    .executeTakeFirst();
}

export async function upsertJob(
  db: Kysely<Database>,
  args: {
    stem: string;
    imagePath: string | null;
    applicationPath: string | null;
    lifecycle: Lifecycle;
  },
): Promise<JobRow> {
  const existing = await getJobByStem(db, args.stem);
  if (existing) {
    const updated = await db
      .updateTable("jobs")
      .set({
        image_path: args.imagePath,
        application_path: args.applicationPath,
        lifecycle: args.lifecycle,
        updated_at: sql`now()`,
      })
      .where("stem", "=", args.stem)
      .returningAll()
      .executeTakeFirstOrThrow();
    return updated;
  }
  const inserted = await db
    .insertInto("jobs")
    .values({
      stem: args.stem,
      image_path: args.imagePath,
      application_path: args.applicationPath,
      lifecycle: args.lifecycle,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return inserted;
}

export async function setLifecycle(
  db: Kysely<Database>,
  jobId: number,
  lifecycle: Lifecycle,
  failureReason?: string | null,
): Promise<void> {
  await db
    .updateTable("jobs")
    .set({
      lifecycle,
      failure_reason: failureReason ?? null,
      updated_at: sql`now()`,
    })
    .where("id", "=", jobId)
    .execute();
}

export async function persistLayer1(
  db: Kysely<Database>,
  jobId: number,
  results: Layer1FieldResult[],
): Promise<void> {
  await db.deleteFrom("layer1_results").where("job_id", "=", jobId).execute();
  if (results.length === 0) return;
  await db
    .insertInto("layer1_results")
    .values(
      results.map((r) => ({
        job_id: jobId,
        field_name: r.fieldName,
        verdict: r.verdict,
        extraction_confidence: r.extractionConfidence,
        extraction_confidence_raw: r.extractionConfidenceRaw,
        message: r.message,
      })),
    )
    .execute();
}

export async function persistLayer2(
  db: Kysely<Database>,
  jobId: number,
  results: Layer2FieldResult[],
): Promise<void> {
  await db.deleteFrom("layer2_results").where("job_id", "=", jobId).execute();
  if (results.length === 0) return;
  await db
    .insertInto("layer2_results")
    .values(
      results.map((r) => ({
        job_id: jobId,
        field_name: r.fieldName,
        verdict: r.verdict,
        message: r.message,
      })),
    )
    .execute();
}

export async function hasLayer1(
  db: Kysely<Database>,
  jobId: number,
): Promise<boolean> {
  const row = await db
    .selectFrom("layer1_results")
    .select(db.fn.countAll<string>().as("c"))
    .where("job_id", "=", jobId)
    .executeTakeFirst();
  return row !== undefined && Number(row.c) > 0;
}
