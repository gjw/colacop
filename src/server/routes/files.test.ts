import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFilesRouter } from "./files.js";

let tmpDir: string;
let baseUrl: string;
let server: ReturnType<express.Express["listen"]>;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "files-test-"));
  // 1×1 transparent PNG so served bytes are real and non-empty.
  const pngBytes = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000000500010d0a2db40000000049454e44ae426082",
    "hex",
  );
  await fs.writeFile(path.join(tmpDir, "cointreau.png"), pngBytes);
  await fs.writeFile(path.join(tmpDir, "evil.exe"), "x");
  await fs.writeFile(path.join(tmpDir, "secret.json"), "{}");

  const app = express();
  app.use("/api/files", createFilesRouter(tmpDir));
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("createFilesRouter", () => {
  it("serves a known image with image content-type", async () => {
    const res = await fetch(`${baseUrl}/api/files/cointreau.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^image\/png/);
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  it("returns 403 for non-image extensions (.exe)", async () => {
    const res = await fetch(`${baseUrl}/api/files/evil.exe`);
    expect(res.status).toBe(403);
  });

  it("returns 403 for non-image extensions (.json)", async () => {
    const res = await fetch(`${baseUrl}/api/files/secret.json`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing image", async () => {
    const res = await fetch(`${baseUrl}/api/files/nope.jpg`);
    expect(res.status).toBe(404);
  });

  it("rejects path traversal attempts", async () => {
    const res = await fetch(
      `${baseUrl}/api/files/${encodeURIComponent("../etc/passwd")}`,
    );
    expect([400, 403, 404]).toContain(res.status);
  });
});
