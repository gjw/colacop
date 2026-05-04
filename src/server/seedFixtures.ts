import path from "node:path";
import { promises as fs } from "node:fs";

export const DEMO_FIXTURES = ["agave", "cointreau", "rumble"] as const;

export interface SeedFixturesOptions {
  fixturesDir: string;
  incomingDir: string;
  names?: readonly string[];
}

export interface SeedFixturesResult {
  copied: number;
  skipped: number;
  missing: string[];
}

const ASSET_EXT_RE = /\.(jpe?g|png|webp|json)$/i;

export async function seedFixtures({
  fixturesDir,
  incomingDir,
  names,
}: SeedFixturesOptions): Promise<SeedFixturesResult> {
  const srcDir = path.resolve(fixturesDir);
  const destDir = path.resolve(incomingDir);
  await fs.mkdir(destDir, { recursive: true });

  const allEntries = await fs.readdir(srcDir);
  const allAssets = allEntries.filter((f) => ASSET_EXT_RE.test(f)).sort();

  const allowed =
    names === undefined ? null : new Set(names.map((n) => n.toLowerCase()));
  const targets =
    allowed === null
      ? allAssets
      : allAssets.filter((f) => allowed.has(stemOf(f).toLowerCase()));

  const missing: string[] = [];
  if (allowed !== null) {
    const presentStems = new Set(allAssets.map((f) => stemOf(f).toLowerCase()));
    for (const want of allowed) {
      if (!presentStems.has(want)) missing.push(want);
    }
  }

  let copied = 0;
  let skipped = 0;
  for (const name of targets) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    try {
      await fs.access(dest);
      skipped += 1;
      continue;
    } catch {
      // not present; copy
    }
    await fs.copyFile(src, dest);
    copied += 1;
  }

  return { copied, skipped, missing };
}

function stemOf(filename: string): string {
  return filename.replace(ASSET_EXT_RE, "");
}
