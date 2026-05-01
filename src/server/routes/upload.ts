import path from "node:path";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";

const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function createUploadRouter(incomingDir: string): Router {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage() });

  router.post(
    "/",
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "application", maxCount: 1 },
    ]),
    async (req, res) => {
      const files = req.files as
        | { image?: Express.Multer.File[]; application?: Express.Multer.File[] }
        | undefined;

      const imageFile = files?.image?.[0];
      const appFile = files?.application?.[0];

      if (!imageFile && !appFile) {
        res.status(400).json({ error: "must include image and/or application" });
        return;
      }

      const stem = `upload-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await fs.mkdir(incomingDir, { recursive: true });

      const written: string[] = [];
      try {
        if (imageFile) {
          const ext = path.extname(imageFile.originalname).toLowerCase();
          if (!ALLOWED_IMAGE_EXTS.has(ext)) {
            res.status(400).json({ error: `unsupported image extension ${ext}` });
            return;
          }
          const dest = path.join(incomingDir, `${stem}${ext}`);
          await fs.writeFile(dest, imageFile.buffer);
          written.push(dest);
        }
        if (appFile) {
          const dest = path.join(incomingDir, `${stem}.json`);
          await fs.writeFile(dest, appFile.buffer);
          written.push(dest);
        }
        res.status(202).json({ stem, written });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: reason });
      }
    },
  );

  return router;
}
