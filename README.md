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

```sh
# Install Node 24.x via nodenv (uses .node-version)
nodenv install

# Install dependencies
npm install

# Configure env (DATABASE_URL, ports, GEMINI_API_KEY)
cp .env.example .env
# then edit .env — at minimum set GEMINI_API_KEY for real label extraction

# Start Postgres
docker compose up -d db

# Run migrations
npm run migrate

# Start the dev server (web + worker)
npm run dev
```

Then open the URL printed by Vite. Drop label/JSON pairs into `data/incoming/` to exercise the watcher path, or use the browser upload UI.

Real label extraction requires `GEMINI_API_KEY` in your environment; without it the worker falls back to a stub provider that returns canned fixture data.

## How the live deployment is updated

For reviewers who care about the deploy story:

```sh
ssh root@colacop.foramerica.dev
cd ~/colacop
git pull
npm ci
npm run migrate
npm run seed:fixtures   # idempotent — copies fixtures/pairs/ into data/incoming/
npm run build
pm2 reload ecosystem.config.cjs
```

This is intentionally manual rather than CI/CD-driven; for a 3-day prototype the iteration speed matters more than the deploy ceremony.

The seed step pre-populates the demo queue with the 6 committed fixture pairs so reviewers see a non-empty queue on first page load. It is idempotent (skips files already present in `data/incoming/`); combined with the worker's restart-idempotency check, repeating the deploy does not re-run Gemini against already-processed pairs.

## Assumptions and limitations

- One label image pairs with one application JSON. Multi-label-per-application (e.g., size variants) is out of scope; in the real COLA system each variant is a separate filing, so this is the COLA-correct unit.
- The government warning is regulation-defined and lives in Layer 1 only; it is **not** part of the application data JSON.
- Zip-archive ingestion with manifests, and out-of-band application-data lookup by COLA filing ID, are explicitly out of scope. A real production deployment would likely use both.
- The model provider is wrapped behind a small interface; the prototype calls Gemini directly. A production deployment at TTB would route through a FedRAMP-authorized endpoint (Vertex AI Government or equivalent) — see ARCHITECTURE.md.
- COLA-system integration is not in scope per the assignment.
- Sensitive document retention is intentionally minimal; the prototype demonstrates the workflow without production-grade PII handling.

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
