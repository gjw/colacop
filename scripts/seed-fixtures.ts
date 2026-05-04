import { seedFixtures } from "../src/server/seedFixtures.js";

try {
  process.loadEnvFile();
} catch {
  // .env absent — rely on shell/PM2 env
}

async function main(): Promise<void> {
  const fixturesDir = process.env["FIXTURES_DIR"] ?? "./fixtures/pairs";
  const incomingDir = process.env["INCOMING_DIR"] ?? "./data/incoming";
  const args = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const names = args.length > 0 ? args : undefined;

  const result = await seedFixtures(
    names === undefined
      ? { fixturesDir, incomingDir }
      : { fixturesDir, incomingDir, names },
  );

  if (names !== undefined) {
    console.log(
      `[seed] requested: ${names.join(", ")} (${result.copied} copied, ${result.skipped} already present)`,
    );
  } else {
    console.log(
      `[seed] all fixtures (${result.copied} copied, ${result.skipped} already present)`,
    );
  }
  if (result.missing.length > 0) {
    console.warn(
      `[seed] WARNING: requested fixtures not found in ${fixturesDir}: ${result.missing.join(", ")}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
