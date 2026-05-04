# colacop — AI-Powered Alcohol Label Verification Prototype

A take-home prototype for the TTB IT Specialist position. Verifies that an alcohol label image matches its corresponding application data, and that the label itself meets TTB regulatory requirements.

## Live deployment

**https://colacop.foramerica.dev** — hosted on a Linode VPS in US Dallas TX. No login required for the prototype.

## What it does

The tool ingests pairs of files: a label image (`.jpg`, `.jpeg`, `.png`, `.webp`) and an application-data JSON file (`.json`) sharing the same filename stem. For each pair it produces two layers of verification results:

- **Layer 1 — Well-formedness.** Checks the label against TTB regulatory requirements that hold regardless of any application data: government warning exact text, mandatory fields present, alcohol-content format, and similar.
- **Layer 2 — Comparison.** Checks extracted label fields against the producer's application data: brand name match, ABV match, net contents match, and similar.

Files in a pair may arrive in either order. If only the image is supplied, Layer 1 runs and Layer 2 reports `needs_application_data`; if only the JSON is supplied, the job is held until the image arrives.

Submissions can be made by either dropping files into the watched `data/incoming/` directory or by uploading through the browser UI. Both paths produce the same internal representation.

## Approach

The prototype follows a deliberate source → fact → requirement → architecture pipeline:

- The original assignment is preserved in `assignment.md`.
- Stakeholder interview material is split into individual citable source files under `discovery/sources/`.
- Facts extracted from those sources live in `discovery/facts.yaml` with provenance, authority context, and tags.
- Requirements derived from fact clusters live in `design/requirements.yaml`.
- Architecture decisions are captured in `ARCHITECTURE.md` with explicit references back to the facts and requirements that motivated them.
- Friction encountered while building this pipeline is logged in `notes/friction.md`.

This level of process is deliberately heavier than the assignment requires; it is part of the implementer's submission, demonstrating how requirements traceability informs design.

On the runtime side, two correctness properties worth flagging: the watcher's `INSERT ... ON CONFLICT (stem)` upsert handles chokidar burst-arrivals race-free at the database, and second-pass processing (JSON-after-image, or after a worker restart) rehydrates extracted fields from persisted Layer 1 rows rather than re-calling the model — one Gemini extraction per pair, not two.

## Tools used

- **Node.js 24.x** (TypeScript, strict mode).
- **React + Vite** for the SPA.
- **Express** for the HTTP API.
- **Kysely + pg** for type-safe SQL access; **Zod** for boundary validation.
- **Postgres** via Docker Compose.
- **Chokidar** for filesystem watching.
- **Google Gemini 3.1 Pro** as the vision model behind a `LabelProvider` interface — the boundary makes provider replacement straightforward (Vertex AI Government, Azure OpenAI, Bedrock would all be reasonable production swaps depending on procurement).
- **PM2** + **nginx** on the VPS.

Full stack rationale and provider choices are in `ARCHITECTURE.md`.

## Running locally

The app runs as three independent long-lived processes — the API, the watcher worker, and the Vite dev server — so local development uses three terminals. (The deployed VPS uses PM2 to manage the same processes; locally we keep it simple.)

### One-time setup

```sh
# Install Node 24.x via nodenv (uses .node-version → 24.14.0)
nodenv install

# Install dependencies
npm install

# Configure env (DATABASE_URL, ports, GEMINI_API_KEY)
cp .env.example .env
# then edit .env — at minimum set GEMINI_API_KEY for real label extraction.
# Without it the worker silently falls back to a stub provider that returns
# canned fixture data — check the worker log for "[worker] provider: ...".

# Start Postgres
docker compose up -d db
# If port 5432 is already in use on your machine, set POSTGRES_PORT=5433
# (or similar) in .env and update DATABASE_URL to match.

# Run migrations
npm run migrate

# Optional: seed the demo fixtures
npm run seed:demo   # copies agave / cointreau / rumble into data/incoming/
```

### Run

In three separate terminals:

```sh
# terminal 1 — API
npm run dev:server

# terminal 2 — watcher worker
npm run dev:worker

# terminal 3 — Vite dev server
npm run dev:web
```

Run only **one** worker. Single-writer is enforced operationally (PM2 in production, your discipline locally); two workers against the same database and `INCOMING_DIR` will race.

Open the URL Vite prints (typically `http://localhost:5173`).

### Verify it works

Drop a paired fixture into the watched directory:

```sh
cp fixtures/pairs/cointreau.* data/incoming/
```

Within a couple of seconds the worker logs that it's processing the pair, and the queue in the UI shows a new job moving through `queued` → `processing` → `processed` with extracted fields and per-field findings. Browser upload through the UI exercises the same code path.

## How the live deployment is updated

For reviewers who care about the deploy story:

```sh
ssh root@colacop.foramerica.dev
cd ~/colacop
git pull
npm ci
npm run migrate
npm run seed:demo       # copies agave/cointreau/rumble into data/incoming/
npm run build
pm2 reload ecosystem.config.cjs
```

This is intentionally manual rather than CI/CD-driven; for a 3-day prototype the iteration speed matters more than the deploy ceremony.

`seed:demo` drops three fixture pairs into `data/incoming/` so the watcher ingests them through the live Gemini pipeline on startup — reviewers' first page load shows a populated queue with real extraction results, not snapshotted DB rows. It is idempotent (skips files already present in `data/incoming/`); the worker's restart-idempotency check additionally avoids re-running Gemini against already-processed pairs across deploys.

**Note on the demo seed:** the chosen trio is deliberate. Cointreau and rumble pass cleanly and demonstrate the happy path. **Agave is included specifically because it surfaces a known issue** — the `classType` field is unstable under the verbatim-extraction prompt, and you may see it land in `needs_review` or with a `low` confidence badge. This is intentional: the demo shows the system flagging real problems on first paint rather than rubber-stamping every label. The other three fixtures (fireball, rumple, shinok) are not seeded but remain available in the in-app fixtures panel for manual upload to exercise the live ingestion path.

Clicking **Reset demo** in the UI runs the same flow: it truncates job/result/decision rows, deletes everything in `data/incoming/`, then reseeds the same three fixtures. Each Reset triggers three live Gemini extractions.

## Prototype scope

System-level boundaries. These are deliberate framing choices, not implementation gaps.

- **No authentication or authorization.** Single-tenant, single-user; no login, no roles, no audit identity. A real TTB deployment would integrate with TTB SSO, role-segregate inspector vs supervisor, and attribute every decision to a named reviewer.
- **No user model.** Decisions are persisted but not attributed to an individual; the prototype demonstrates the adjudication mechanism, not the accountability layer a real COLA system requires.
- **The reviewer workflow is modeled from public documentation, not from inspector shadowing.** Queue → job detail → adjudicate is a reasonable interpretation of TTB COLA pre-review drawn from the assignment material and public sources. It is not a faithful reproduction of what specific TTB inspectors do day-to-day; production work would start with shadowing.
- **Regulatory coverage is illustrative, not exhaustive.** The Layer 1 rules (government warning text, mandatory-field presence, ABV format, net contents normalization) are drawn from a targeted reading of the relevant CFR sections. They do not cover all of 27 CFR Parts 4 / 5 / 7 — varietal rules for wine, age statements for distilled spirits, and class/type designation subtleties for malt beverages each have edges not modeled here. The architecture treats rules as data, so coverage expands without re-architecting the verifier.
- **No COLA-system integration.** Application data arrives as a JSON file; a real deployment would fetch the application by filing ID from the COLA system.
- **No production PII / retention / FedRAMP controls.** Postgres defaults only; no encryption-at-rest beyond the database, no retention policy, no FedRAMP/FIPS posture. A production deployment at TTB would route the model provider through a FedRAMP-authorized endpoint (Vertex AI Government or equivalent — see `ARCHITECTURE.md`) and add the document-handling controls a real submission flow requires.
- **Single environment, US-market, English-only.** No staging/prod split; no non-ASCII labels; no non-US warnings.

## Known limitations and scope decisions

Within the prototype's scope: where the implementation deliberately stops short, and where features were scoped out at the boundary.

### Implementation limitations

- **Single-writer worker is operational, not enforced in code.** PM2 manages a single worker on the live VPS, so production is safe. Locally, running the worker process twice against the same database and `INCOMING_DIR` will race; reviewers should run only one worker.
- **Stub-provider fallback is silent in the UI.** When `GEMINI_API_KEY` is unset the worker falls back to canned fixture extractions and logs `[worker] provider: StubLabelProvider`. The UI does not surface which provider produced a row. Production verified to use Gemini; local reviewers without a key see stub data.
- **No retry/backoff on Gemini 429.** Gemini 3.1 Pro enforces 25 RPM regardless of spend. The worker does not retry; a burst that trips the limit fails the affected jobs with `lifecycle: failed` and the raw 429 in `failure_reason`. The 3-fixture demo seed stays well under in practice.

### Scope decisions

- **One label image pairs with one application JSON.** Multi-label-per-application (e.g., size variants) is out of scope; in the real COLA system each variant is a separate filing, so this is the COLA-correct unit.
- **Browser upload is one pair at a time.** Batch ingestion uses the watched directory `data/incoming/`; the UI surfaces this path for local-install reviewers who want to drop many pairs.
- **Adjudication is label-level only.** The reviewer's decision unit is one label → one decision (approve / reject / send_back). Per-finding overrides ("I accept this brand drift") are deliberate future work; the data model supports them but the prototype keeps the boundary at the label.
- **Fixture set is six real bottles.** An exhaustive edge-case matrix (intentional warning violation, missing-back-panel, deliberately bad photography) was scoped out; reviewers exercise these scenarios via mismatched-pair uploads through the UI.
- **No zip-archive or bundled-input ingestion.** Each pair arrives as two files — in a watched directory or via the upload form.
- **The government warning is regulation-defined and lives in Layer 1 only; it is not part of the application data JSON.**

## Repo layout

```text
assignment.md           original take-home (markdown)
ARCHITECTURE.md         system design with fact/req references
CONTEXT.md              project constraints and roles
CLAUDE.md               agent runtime instructions
discovery/
  sources/              one file per stakeholder/external source
  facts.yaml            extracted facts with provenance
design/
  requirements.yaml     design commitments derived from facts
notes/
  sprint-order.md       working order through the deadline
  friction.md           friction log for the discovery pipeline
docs/
  handoff.md            continuity notes for the next collaborator
src/                    application code
  server/               Express API
  worker/               Chokidar watcher + processing
  core/                 verification, providers, schemas
  db/                   Kysely connection, schema, migrations
  web/                  React + Vite SPA
data/
  incoming/             watched directory; drop pairs here
  processing/
  processed/
  failed/
```

## Status

Active prototype. See `notes/sprint-order.md` for the current work order and `bv --robot-triage` (or `br ready --json`) for the live issue queue.
