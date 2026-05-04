import { promises as fs } from "node:fs";
import type { Kysely } from "kysely";
import type { Database } from "../db/schema.js";
import { applicationDataSchema, type ApplicationData } from "../core/schemas.js";
import { runLayer1, runLayer2 } from "../core/verification.js";
import type { LabelProvider } from "../core/providers/types.js";
import {
  getJobByStem,
  getLayer1Rows,
  getLayer2Rows,
  hasLayer1,
  persistLayer1,
  persistLayer2,
  setLifecycle,
} from "./repo.js";
import { rehydrateExtractedFields } from "./rehydrate.js";

async function loadApplication(
  applicationPath: string,
): Promise<ApplicationData> {
  const raw = await fs.readFile(applicationPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return applicationDataSchema.parse(parsed);
}

export async function processStem(
  db: Kysely<Database>,
  provider: LabelProvider,
  stem: string,
): Promise<void> {
  const job = await getJobByStem(db, stem);
  if (!job) return;
  if (job.lifecycle !== "queued") return;

  await setLifecycle(db, job.id, "processing");

  try {
    if (job.image_path !== null) {
      const layer1Already = await hasLayer1(db, job.id);
      if (!layer1Already) {
        const extracted = await provider.analyzeLabel(job.image_path);
        const layer1 = runLayer1(extracted);
        await persistLayer1(db, job.id, layer1);

        let application: ApplicationData | null = null;
        if (job.application_path !== null) {
          application = await loadApplication(job.application_path);
        }
        const layer2 = runLayer2(extracted, application);
        await persistLayer2(db, job.id, layer2);

        await setLifecycle(
          db,
          job.id,
          job.application_path !== null ? "processed" : "awaiting_application",
        );
        return;
      }

      if (job.application_path !== null) {
        const layer1Rows = await getLayer1Rows(db, job.id);
        const layer2Rows = await getLayer2Rows(db, job.id);
        const extracted = rehydrateExtractedFields(layer1Rows, layer2Rows);
        const application = await loadApplication(job.application_path);
        const layer2 = runLayer2(extracted, application);
        await persistLayer2(db, job.id, layer2);
        await setLifecycle(db, job.id, "processed");
        return;
      }

      await setLifecycle(db, job.id, "awaiting_application");
      return;
    }

    await setLifecycle(db, job.id, "awaiting_label");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await setLifecycle(db, job.id, "failed", reason);
  }
}
