import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, createPool } from "../db/kysely.js";
import type { Database } from "../db/schema.js";
import type { LabelProvider } from "../core/providers/types.js";
import type { ExtractedFields } from "../core/schemas.js";
import { processStem } from "./process.js";
import { upsertJob } from "./repo.js";

try {
  process.loadEnvFile();
} catch {
  // .env absent — fall through to process env
}

const databaseUrl = process.env["DATABASE_URL"];
const describeIfDb = databaseUrl ? describe : describe.skip;

class CountingProvider implements LabelProvider {
  calls = 0;
  constructor(private readonly fixture: ExtractedFields) {}
  async analyzeLabel(_imagePath: string): Promise<ExtractedFields> {
    this.calls += 1;
    return this.fixture;
  }
}

const FIXTURE: ExtractedFields = {
  brandName: { value: "Cointreau", confidence: "hi", confidenceRaw: 0.95 },
  classType: { value: "LIQUEUR", confidence: "hi", confidenceRaw: 0.95 },
  alcoholContent: {
    value: "ALC. 40% BY VOL.",
    confidence: "hi",
    confidenceRaw: 0.95,
  },
  netContents: { value: "750 mL", confidence: "hi", confidenceRaw: 0.95 },
  producerName: {
    value: "Rémy Cointreau",
    confidence: "hi",
    confidenceRaw: 0.95,
  },
  producerAddress: {
    value: "Angers, France",
    confidence: "hi",
    confidenceRaw: 0.95,
  },
  governmentWarning: {
    value:
      "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.",
    confidence: "hi",
    confidenceRaw: 0.95,
  },
};

describeIfDb("processStem", () => {
  let db: ReturnType<typeof createDb<Database>>;
  let pool: ReturnType<typeof createPool>;
  let appJsonPath: string;

  beforeAll(async () => {
    if (!databaseUrl) return;
    pool = createPool(databaseUrl);
    db = createDb<Database>(pool);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "colacop-process-"));
    appJsonPath = path.join(dir, "cointreau.json");
    await fs.writeFile(
      appJsonPath,
      JSON.stringify({
        brandName: "Cointreau",
        classType: "Liqueur",
        alcoholContent: 40,
        netContents: "750 mL",
        producerName: "Rémy Cointreau",
        producerAddress: "Angers, France",
      }),
    );
  });

  afterAll(async () => {
    if (!databaseUrl) return;
    await db.destroy();
  });

  beforeEach(async () => {
    if (!databaseUrl) return;
    await sql`TRUNCATE TABLE jobs, layer1_results, layer2_results, decisions RESTART IDENTITY CASCADE`.execute(
      db,
    );
  });

  it("calls analyzeLabel exactly once when image arrives before JSON", async () => {
    const stem = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provider = new CountingProvider(FIXTURE);

    await upsertJob(db, {
      stem,
      imagePath: "/fake/cointreau.jpg",
      applicationPath: null,
      lifecycle: "queued",
    });
    await processStem(db, provider, stem);

    expect(provider.calls).toBe(1);

    await upsertJob(db, {
      stem,
      imagePath: "/fake/cointreau.jpg",
      applicationPath: appJsonPath,
      lifecycle: "queued",
    });
    await processStem(db, provider, stem);

    expect(provider.calls).toBe(1);

    const job = await db
      .selectFrom("jobs")
      .selectAll()
      .where("stem", "=", stem)
      .executeTakeFirstOrThrow();
    expect(job.lifecycle).toBe("processed");

    const layer2 = await db
      .selectFrom("layer2_results")
      .selectAll()
      .where("job_id", "=", job.id)
      .execute();
    expect(layer2.length).toBeGreaterThan(0);
    const brand = layer2.find((r) => r.field_name === "brandName");
    expect(brand?.verdict).toBe("pass");
  });
});

describeIfDb("upsertJob", () => {
  let db: ReturnType<typeof createDb<Database>>;
  let pool: ReturnType<typeof createPool>;

  beforeAll(async () => {
    if (!databaseUrl) return;
    pool = createPool(databaseUrl);
    db = createDb<Database>(pool);
  });

  afterAll(async () => {
    if (!databaseUrl) return;
    await db.destroy();
  });

  beforeEach(async () => {
    if (!databaseUrl) return;
    await sql`TRUNCATE TABLE jobs, layer1_results, layer2_results, decisions RESTART IDENTITY CASCADE`.execute(
      db,
    );
  });

  it("survives concurrent inserts on the same stem with no duplicate-key error", async () => {
    const stem = `race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const both = await Promise.all([
      upsertJob(db, {
        stem,
        imagePath: "/fake/race.jpg",
        applicationPath: null,
        lifecycle: "awaiting_application",
      }),
      upsertJob(db, {
        stem,
        imagePath: null,
        applicationPath: "/fake/race.json",
        lifecycle: "awaiting_label",
      }),
    ]);
    expect(both[0].stem).toBe(stem);
    expect(both[1].stem).toBe(stem);
    const rows = await db
      .selectFrom("jobs")
      .selectAll()
      .where("stem", "=", stem)
      .execute();
    expect(rows.length).toBe(1);
  });
});
