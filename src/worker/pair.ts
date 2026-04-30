import path from "node:path";
import type { Lifecycle } from "../db/schema.js";

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type FileKind = "image" | "json";

export function classifyFile(filePath: string): FileKind | null {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTS.has(ext)) return "image";
  if (ext === ".json") return "json";
  return null;
}

export function stemOf(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export interface PairTransition {
  imagePath: string | null;
  applicationPath: string | null;
  lifecycle: Lifecycle;
}

export function nextLifecycle(
  current: PairTransition | null,
  incoming: { kind: FileKind; filePath: string },
): PairTransition {
  const imagePath =
    incoming.kind === "image" ? incoming.filePath : (current?.imagePath ?? null);
  const applicationPath =
    incoming.kind === "json"
      ? incoming.filePath
      : (current?.applicationPath ?? null);

  if (imagePath === null && applicationPath !== null) {
    return { imagePath, applicationPath, lifecycle: "awaiting_label" };
  }
  if (imagePath !== null && applicationPath === null) {
    if (current?.lifecycle === "awaiting_application") {
      return { imagePath, applicationPath, lifecycle: "awaiting_application" };
    }
    return { imagePath, applicationPath, lifecycle: "queued" };
  }
  if (imagePath !== null && applicationPath !== null) {
    return { imagePath, applicationPath, lifecycle: "queued" };
  }
  throw new Error("nextLifecycle: incoming file must populate at least one path");
}
