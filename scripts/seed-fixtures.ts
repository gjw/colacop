import { promises as fs } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  // .env absent — rely on shell/PM2 env
}

async function main(): Promise<void> {
  const pairsDir = path.resolve(
    process.env["FIXTURES_DIR"] ?? "./fixtures/pairs",
  );
  const incomingDir = path.resolve(
    process.env["INCOMING_DIR"] ?? "./data/incoming",
  );

  await fs.mkdir(incomingDir, { recursive: true });

  const entries = await fs.readdir(pairsDir);
  const files = entries.filter((f) =>
    /\.(jpe?g|png|webp|json)$/i.test(f),
  );

  let copied = 0;
  let skipped = 0;
  for (const name of files.sort()) {
    const src = path.join(pairsDir, name);
    const dest = path.join(incomingDir, name);
    try {
      await fs.access(dest);
      skipped += 1;
      console.log(`[seed] skip ${name} (already in incoming)`);
      continue;
    } catch {
      // not present, copy below
    }
    await fs.copyFile(src, dest);
    copied += 1;
    console.log(`[seed] copy ${name}`);
  }

  console.log(`[seed] done: ${copied} copied, ${skipped} already present`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
