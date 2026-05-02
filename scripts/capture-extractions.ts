import { promises as fs } from "node:fs";
import path from "node:path";
import { GeminiLabelProvider } from "../src/core/providers/gemini.js";

async function main(): Promise<void> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error("GEMINI_API_KEY not set");
  }

  const labelsDir = path.resolve("fixtures/labels");
  const outDir = path.resolve("fixtures/raw");
  await fs.mkdir(outDir, { recursive: true });

  const entries = await fs.readdir(labelsDir);
  const stems = entries
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => ({ stem: path.basename(f, path.extname(f)), file: f }))
    .sort((a, b) => a.stem.localeCompare(b.stem));

  const provider = new GeminiLabelProvider({ apiKey });

  const summary: Array<{ stem: string; alcoholContent: string }> = [];
  for (const { stem, file } of stems) {
    const imagePath = path.join(labelsDir, file);
    console.log(`[capture] ${stem}: starting`);
    const extracted = await provider.analyzeLabel(imagePath);
    const outPath = path.join(outDir, `${stem}.extraction.json`);
    await fs.writeFile(outPath, JSON.stringify(extracted, null, 2) + "\n");
    summary.push({ stem, alcoholContent: extracted.alcoholContent.value });
    console.log(`[capture] ${stem}: alcoholContent=${JSON.stringify(extracted.alcoholContent.value)}`);
  }

  console.log("\n=== ABV strings ===");
  for (const row of summary) {
    console.log(`${row.stem.padEnd(12)} → ${JSON.stringify(row.alcoholContent)}`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
