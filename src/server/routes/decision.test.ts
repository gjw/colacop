import type { AddressInfo } from "node:net";
import express from "express";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool } from "../../db/kysely.js";
import type { Database } from "../../db/schema.js";
import { createJobsRouter } from "./jobs.js";

try {
  process.loadEnvFile();
} catch {
  // .env absent — fall through to process env
}

let baseUrl: string;
let server: ReturnType<express.Express["listen"]>;
let db: ReturnType<typeof createDb<Database>>;
let pool: ReturnType<typeof createPool>;

let jobId: number;
let layer1Id: number;
let layer2Id: number;

const databaseUrl = process.env["DATABASE_URL"];

const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb("POST /api/jobs/:id/decision", () => {
  beforeAll(async () => {
    if (!databaseUrl) return;
    pool = createPool(databaseUrl);
    db = createDb<Database>(pool);

    const app = express();
    app.use(express.json());
    app.use("/api/jobs", createJobsRouter(db));
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (!databaseUrl) return;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await db.destroy();
  });

  beforeEach(async () => {
    if (!databaseUrl) return;
    await sql`TRUNCATE TABLE jobs, layer1_results, layer2_results, decisions RESTART IDENTITY CASCADE`.execute(
      db,
    );
    const job = await db
      .insertInto("jobs")
      .values({
        stem: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        image_path: null,
        application_path: null,
        lifecycle: "processed",
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    jobId = job.id;

    const l1 = await db
      .insertInto("layer1_results")
      .values({
        job_id: jobId,
        field_name: "government_warning",
        verdict: "needs_review",
        extraction_confidence: "med",
        extraction_confidence_raw: null,
        message: "fixture",
        extracted_value: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    layer1Id = l1.id;

    const l2 = await db
      .insertInto("layer2_results")
      .values({
        job_id: jobId,
        field_name: "brand_name",
        verdict: "needs_review",
        message: "fixture",
        extracted_value: null,
        application_value: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    layer2Id = l2.id;
  });

  async function postDecision(body: unknown): Promise<Response> {
    return await fetch(`${baseUrl}/api/jobs/${jobId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("approve persists with optional note", async () => {
    const res = await postDecision({
      outcome: "approve",
      note: "looks fine",
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { decision: { outcome: string } };
    expect(data.decision.outcome).toBe("approve");
  });

  it("reject without cited_findings is 400", async () => {
    const res = await postDecision({
      outcome: "reject",
      cited_findings: [],
    });
    expect(res.status).toBe(400);
  });

  it("reject with valid layer1 + layer2 citations persists", async () => {
    const res = await postDecision({
      outcome: "reject",
      cited_findings: [
        { layer: 1, id: layer1Id },
        { layer: 2, id: layer2Id },
      ],
      note: "warning text and brand both off",
    });
    expect(res.status).toBe(201);
  });

  it("reject with citation that does not belong to the job is 400", async () => {
    const res = await postDecision({
      outcome: "reject",
      cited_findings: [{ layer: 1, id: 999999 }],
    });
    expect(res.status).toBe(400);
  });

  it("send_back without missing items is 400", async () => {
    const res = await postDecision({
      outcome: "send_back",
      missing: [],
    });
    expect(res.status).toBe(400);
  });

  it("send_back with valid missing items persists", async () => {
    const res = await postDecision({
      outcome: "send_back",
      missing: ["abv_substantiation", "address_verification"],
      note: "need certs",
    });
    expect(res.status).toBe(201);
  });

  it("send_back with 'other' but no note is 400", async () => {
    const res = await postDecision({
      outcome: "send_back",
      missing: ["other"],
    });
    expect(res.status).toBe(400);
  });

  it("second decision on same job is 409", async () => {
    const first = await postDecision({ outcome: "approve" });
    expect(first.status).toBe(201);
    const second = await postDecision({ outcome: "approve" });
    expect(second.status).toBe(409);
  });

  it("after decision, default GET /api/jobs excludes the job", async () => {
    await postDecision({ outcome: "approve" });
    const res = await fetch(`${baseUrl}/api/jobs`);
    const data = (await res.json()) as { jobs: Array<{ id: number }> };
    expect(data.jobs.find((j) => j.id === jobId)).toBeUndefined();
  });

  it("after decision, GET /api/jobs?decided=true includes the job with its decision", async () => {
    await postDecision({ outcome: "approve" });
    const res = await fetch(`${baseUrl}/api/jobs?decided=true`);
    const data = (await res.json()) as {
      jobs: Array<{ id: number; decision?: { outcome: string } | null }>;
    };
    const found = data.jobs.find((j) => j.id === jobId);
    expect(found).toBeDefined();
    expect(found?.decision?.outcome).toBe("approve");
  });

  it("after decision, GET /api/jobs/:id includes the decision", async () => {
    await postDecision({ outcome: "approve", note: "fine" });
    const res = await fetch(`${baseUrl}/api/jobs/${jobId}`);
    const data = (await res.json()) as {
      decision: { outcome: string } | null;
    };
    expect(data.decision?.outcome).toBe("approve");
  });
});
