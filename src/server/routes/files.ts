import path from "node:path";
import { promises as fs } from "node:fs";
import { Router } from "express";

const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function createFilesRouter(incomingDir: string): Router {
  const router = Router();
  const root = path.resolve(incomingDir);

  router.get("/:filename", async (req, res) => {
    const requested = req.params["filename"] ?? "";
    const safe = path.basename(requested);
    if (safe !== requested || safe === "") {
      res.status(400).json({ error: "invalid filename" });
      return;
    }
    const ext = path.extname(safe).toLowerCase();
    if (!ALLOWED_IMAGE_EXTS.has(ext)) {
      res.status(403).json({ error: "extension not allowed" });
      return;
    }
    const abs = path.join(root, safe);
    try {
      const stat = await fs.stat(abs);
      if (!stat.isFile()) {
        res.status(404).json({ error: "not found" });
        return;
      }
    } catch {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.type(CONTENT_TYPES[ext] ?? "application/octet-stream");
    res.sendFile(abs);
  });

  return router;
}
