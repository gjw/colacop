import path from "node:path";
import chokidar from "chokidar";
import type { Kysely } from "kysely";
import type { Database } from "../db/schema.js";
import type { LabelProvider } from "../core/providers/types.js";
import { classifyFile, nextLifecycle, stemOf } from "./pair.js";
import { getJobByStem, upsertJob } from "./repo.js";
import { processStem } from "./process.js";

const stemQueues = new Map<string, Promise<void>>();

function enqueue(stem: string, fn: () => Promise<void>): Promise<void> {
  const prev = stemQueues.get(stem) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  stemQueues.set(
    stem,
    next.finally(() => {
      if (stemQueues.get(stem) === next) stemQueues.delete(stem);
    }),
  );
  return next;
}

async function handleFile(
  db: Kysely<Database>,
  provider: LabelProvider,
  filePath: string,
): Promise<void> {
  const kind = classifyFile(filePath);
  if (!kind) return;
  const stem = stemOf(filePath);
  const absPath = path.resolve(filePath);

  await enqueue(stem, async () => {
    const existing = await getJobByStem(db, stem);
    const current = existing
      ? {
          imagePath: existing.image_path,
          applicationPath: existing.application_path,
          lifecycle: existing.lifecycle,
        }
      : null;
    const transition = nextLifecycle(current, { kind, filePath: absPath });

    const isNoop =
      current !== null &&
      transition.imagePath === current.imagePath &&
      transition.applicationPath === current.applicationPath &&
      transition.lifecycle === current.lifecycle;

    if (!isNoop) {
      await upsertJob(db, {
        stem,
        imagePath: transition.imagePath,
        applicationPath: transition.applicationPath,
        lifecycle: transition.lifecycle,
      });
    }

    if (transition.lifecycle === "queued") {
      await processStem(db, provider, stem);
    }
  });
}

export interface WatcherHandle {
  close(): Promise<void>;
}

export function startWatcher(
  db: Kysely<Database>,
  provider: LabelProvider,
  incomingDir: string,
): WatcherHandle {
  const watcher = chokidar.watch(incomingDir, {
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    ignoreInitial: false,
    depth: 0,
  });

  // Subscribe to both add and change. Chokidar with awaitWriteFinish can
  // emit `change` instead of `add` when a path is unlinked and recreated
  // within the stability window — which is exactly what the Reset demo
  // flow does (server unlinks files, then immediately copyFile's fixtures
  // back). handleFile is idempotent (atomic upsert + no-op detection),
  // so handling both events is safe.
  const onFile = (filePath: string): void => {
    handleFile(db, provider, filePath).catch((err: unknown) => {
      console.error("[watcher] handleFile failed:", err);
    });
  };
  watcher.on("add", onFile);
  watcher.on("change", onFile);

  watcher.on("error", (err) => {
    console.error("[watcher] error:", err);
  });

  return {
    async close() {
      await watcher.close();
    },
  };
}
