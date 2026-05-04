# Architecture

This document records the current implementation direction. It is not a final design spec; it captures the stack and architecture we intend to start from based on the facts and requirements already extracted.

## Tool Positioning & Vocabulary

This project is **agent-assisted COLA pre-review**, not automated COLA review. The distinction is regulatory, not stylistic, and it governs the words used in the UI, README, decision controls, and any explanatory copy.

**The TTB specialist is the reviewer.** Always. The COLA review is the regulatory action of record — approval, return for correction, or rejection — and it is performed by a human exercising delegated authority. This tool does not have that authority and must not be described as if it does. Calling the tool a "review" muddies who decided what; in a regulatory or audit context that is a real problem.

**The tool produces a recommendation, with evidence.** It reads the label (input), checks the label against TTB regulation and the application data (analysis), and emits a structured set of findings the specialist can accept, override, or amend (output). The findings cite the specific CFR section, prior COLA, or policy that triggered each flag. The job of the tool is not to be right; it is to be *right about why it might be wrong* — a flag like "alcohol content statement may violate 27 CFR 4.36(b)(1) because [reason]; confidence medium" is enormously more useful than "rejected." The first lets the specialist adjudicate in seconds; the second forces them to redo the work.

**The HITL adjudicates.** The decision step (cc-syy: approve / reject / send_back) is the specialist's adjudication of the tool's recommendation. When their adjudication diverges from the tool's recommendation, that is an *override* and is itself valuable signal — logged overrides become training data and surface places where rules-as-coded diverge from rules-as-practiced.

### Canonical vocabulary

| Use | Don't use |
|---|---|
| The tool **reads** labels and **screens** / **pre-reviews** applications | "the tool reviews" |
| The tool produces a **recommendation**, an **assessment**, or **findings** | "the tool decides" / "the tool approves" |
| The specialist (HITL) **reviews** the application; the tool's output is one input to that review | (no clean substitute — review is the human's word) |
| The HITL **adjudicates** the recommendation: accepts, overrides, or amends | "the user submits a review" |
| Per-finding **verdict** (pass / fail / needs_review / needs_application_data) | "decision" — that's the HITL's word, not the tool's |
| Label-level **decision** (approve / reject / send_back) | "verdict" — that's the tool's word, not the HITL's |
| **Override** = HITL decision diverges from tool recommendation | (don't avoid the word; surface it) |

### Where this lands

- In-app header should read along the lines of "colacop · agent-assisted TTB label pre-review" (or similar — never "label review" alone, which implies the tool is performing it).
- Decision UI (cc-syy) section header reads "Adjudicate" or "Record decision," not "Submit review." Buttons stay Approve / Reject / Send back — those are the HITL's adjudication outcomes.
- README leans into the "right about why it might be wrong" framing in the approach summary.
- Layer 1 / Layer 2 are *findings* with CFR citations; the existing per-finding `extracted_value` + `message` + cited regulation is exactly the assistance pattern this framing demands. Don't lose that thread.

## Chosen Stack

The prototype should be built with:

- Node.js 24.x
- TypeScript
- React + Vite for the browser UI
- Express for the HTTP API
- Zod for runtime validation at application boundaries
- Postgres running through Docker Compose
- Kysely for type-safe SQL query construction and database access, plus its migration API
- Chokidar for filesystem watching
- PM2 for long-running production processes on the VPS
- nginx as the public reverse proxy

Node 24.x is an appropriate target because it is the current Active LTS line. Reference `24.x` in prose, but `.node-version` must contain a full `MAJOR.MINOR.PATCH` value because nodenv does not do prefix matching — `24` or `24.x` will fail with `version not installed`.

Use `nodenv` to lock the local Node version for the repo through a committed `.node-version` file pinned to a specific patch (e.g. `24.14.0`). Workflow should be tracked with `br` (`beads_rust`) and viewed with `bv`; note that `br sync --flush-only` exports bead state but does not run git commands, so `.beads/` changes must be committed explicitly when bead state is part of a commit.

## Why This Stack

TypeScript is the safest language choice for this assignment. It is familiar to reviewers, strongly supported by current coding tools, and works well across the UI, API, worker, validation, and shared domain types.

React with Vite gives us a straightforward frontend without pulling the project into a full-stack framework whose assumptions may not match a long-running worker process. The app is workflow-heavy rather than content-heavy, so a small React SPA backed by an API is enough.

Express is preferred over Fastify because the implementer is more familiar with it and the app does not need Fastify's performance or schema features. Express is conventional, easy to review, and fast enough for this workload.

Zod gives us explicit runtime validation for API payloads, worker inputs, model-provider responses, and parsed result objects. TypeScript alone is not enough at these boundaries because files, database rows, uploads, and LLM/OCR outputs are runtime data.

Postgres in Docker is acceptable even though SQLite would also be enough. Postgres is familiar to the implementer, production-shaped, and useful for persisted queue state, JSON result payloads, and review records. Docker Compose keeps local setup reasonable for graders.

Kysely was chosen over Knex for the SQL access layer. Reasoning: under our `strict` + `noUncheckedIndexedAccess` + no-cast TypeScript rules, Knex's untyped query builder forces hand-written row interfaces and casts at every boundary. Kysely is schema-first — a single `Database` interface drives end-to-end type inference for queries, joins, and inserts, and column typos surface as compile errors. It also gives us a migration API; a small `kysely-ctl`- or script-based runner replaces Knex's CLI, which is a small cost at this scale (we expect ~4-6 migrations). SQL should still remain visible and understandable; avoid hiding the data model behind deep abstractions.

The shared `Database` interface in `src/db/schema.ts` is the source of truth for row shapes; `core/schemas.ts` Zod schemas validate at external boundaries (HTTP, filesystem, model-provider responses) and may differ from row shapes when needed.

`jsonb` columns need a split read/write type because `node-postgres` parses JSONB on read but does not stringify on write — declare them as `ColumnType<T, string | null, string | null>` (see `JsonbColumn<T>` in `src/db/schema.ts`) and `JSON.stringify` the value on insert/update. Plain object/array values pass through and the insert silently 500s.

## Process Shape

The architecture should preserve the core workflow implied by the requirements:

```text
browser upload or watched directory
  -> ingestion service
  -> job record
  -> background worker
  -> OCR/LLM extraction and verification
  -> persisted results
  -> review UI
```

The UI should be queue-first rather than upload-first. Agents should primarily see submitted work, processing status, verification results, and items that need review. Uploading through the browser should be supported, but it should feed the same ingestion path as files dropped into the watched directory.

## Input Pairing

A "label" submission is a pair of files sharing a filename stem:

- An image file (`.jpg`, `.jpeg`, `.png`, `.webp`) — the label artwork.
- A JSON file (`.json`) — the application data describing what the producer claims is on the label.

Pairing is by stem: `42.jpg` pairs with `42.json`. Stems may be any consistent identifier (numeric, UUID, ULID, COLA-style alphanumeric); the app does not enforce a format. Fixtures dictate.

### Application data schema

The JSON file contains the matchable fields a TTB agent would compare against the label. The government warning is **not** in the application data — it is regulation-defined and lives in Layer 1 only.

```ts
type ApplicationData = {
  brandName: string;
  classType: string;          // e.g. "Kentucky Straight Bourbon Whiskey"
  alcoholContent: string;     // e.g. "45.0%" — format-flexible; comparison normalizes
  netContents: string;        // e.g. "750 mL"
  producerName: string;
  producerAddress: string;
  countryOfOrigin?: string;   // present only for imports
};
```

Per-field application gaps (e.g., JSON present but `countryOfOrigin` missing for what turns out to be an import) are reported as `needs_application_data` for that field specifically, not for the whole label.

### One-to-one mapping

One image pairs with one JSON. A batch is N pairs in the watched directory, **not** one pair containing N labels. This matches the real COLA-system semantics where each unique label has its own filing.

Multi-label-per-application (e.g., size variants of the same product) is out of scope for the prototype. If a real reviewer asks "what about variants?" the answer is: each variant is a separate COLA filing, so the prototype's one-to-one model is the COLA-correct unit.

### Pairing timing

Files in the pair may arrive in either order or simultaneously. The watcher subscribes to both image and JSON file events. On any event, look up the existing job by stem and upsert:

```text
both arrive together                  -> create job, lifecycle queued -> processing,
                                         run Layer 1, run Layer 2, lifecycle processed
image first, JSON later               -> create job (application_data = null),
                                         lifecycle queued -> processing,
                                         run Layer 1, lifecycle awaiting_application
                                         (Layer 2 not runnable);
                                         when JSON later arrives, lifecycle
                                         awaiting_application -> queued -> processing,
                                         re-run Layer 2 only (Layer 1 stable),
                                         lifecycle processed
JSON first, image later               -> create job (application_data set),
                                         lifecycle awaiting_label, nothing runs;
                                         when image arrives, lifecycle
                                         awaiting_label -> queued -> processing,
                                         run Layer 1 then Layer 2, lifecycle processed
```

Lifecycle and verdict are separate axes. Lifecycle is a single column on `jobs` with values `awaiting_label | awaiting_application | queued | processing | processed | failed`. Verdict is per-field on result rows: Layer 1 fields take `pass | fail | needs_review`; Layer 2 fields take `pass | fail | needs_review | needs_application_data`. The verdict-derived "needs review" UI bucket is a filter over `processed` jobs whose result rows contain any `needs_review`. `failed` is reserved for system-level failures (worker crash, file-read error); a label whose Layer 1 fields all came back `needs_review` is `processed` with bad verdicts, not `failed`.

Re-running Layer 2 is safe: Layer 1 results are derived from the image, and the image does not change. The job record carries Layer 1 and Layer 2 results in separate columns / categories so re-runs do not clobber stable results.

Chokidar must be configured with `awaitWriteFinish` so the watcher does not fire on partially-written files.

### Browser upload symmetry

Browser upload accepts a paired submission (label image + application JSON, either as two file inputs or a multipart payload) and produces the same internal representation as a watched-directory drop. Browser submissions degrade gracefully if only the label image is supplied. The browser-upload path *creates the same job records* as the watcher; nothing diverges past the ingestion seam.

### Out of scope

- Bundled inputs (zip archives with manifests, tar streams, etc.) — explicitly not supported.
- Out-of-band application-data fetch (looking up the application by ID from a COLA database) — explicitly not supported. The application data must arrive as a file. This is a meaningful divergence from a real production deployment, and the README should note it.
- Same-stem replacement of an already-ingested file (image or JSON) — undefined behavior (F-057). Once a stem has a job and at least one layer has run, dropping a new file with the same stem will not re-version inputs or re-run affected layers. A production deployment would version inputs and re-run on content change; the prototype does not.

## Runtime Components

Use two long-running Node processes:

```text
web/api process
worker process
```

The web/API process should:

- serve the built React frontend
- expose API routes for jobs, results, uploads, and review outcomes
- validate all inputs with Zod
- write uploads into the ingestion path (data/incoming/) so the watcher picks them up; the upload route never bypasses the watcher to create jobs directly, keeping a single ingestion code path
- read persisted queue and verification state from Postgres

The worker process should:

- watch an incoming directory with Chokidar
- create or claim job records
- move files through processing states
- call the OCR/model-provider layer
- write extracted fields and verification results to Postgres
- move source files to processed or failed locations

The two processes should share domain types, validation schemas, and database access helpers, but they should have distinct entry points.

## Suggested Project Layout

One repo is enough. A monorepo is optional, but do not overcomplicate the structure.

Suggested layout:

```text
src/
  server/
    index.ts
    routes/
  worker/
    index.ts
    ingest.ts
  web/
    ...
  core/
    schemas.ts
    verification.ts
    providers/
  db/
    kysely.ts
    schema.ts
    jobs.ts
    reviews.ts
    migrations/
data/
  incoming/
  processing/
  processed/
  failed/
design/
discovery/
```

If Vite's defaults make `src/web` awkward, use the normal Vite layout and keep server/worker/core/db alongside it. Favor clarity over purity.

## Database Responsibilities

Postgres should persist enough state for the UI and worker to coordinate:

- jobs
- source file metadata
- processing status
- extracted label fields
- verification results
- review outcomes
- error messages
- timestamps for received, started, completed, and reviewed events

Likely job statuses:

```text
queued
processing
processed
needs_review
failed
reviewed
```

Keep raw uploaded files on disk for the prototype unless requirements change. Store paths and metadata in Postgres. Do not persist sensitive data beyond what the prototype needs to demonstrate the workflow.

## Model Provider Boundary

The model/OCR layer sits behind a small interface. The application is not hard-coded throughout to a single provider.

This is motivated by:

- network restrictions and blocked cloud endpoints
- prior vendor-pilot failures
- Anthropic-specific supply-chain/procurement risk
- general risk from depending on a single external model provider

### First implementation: Google Gemini 3.1 Pro

The first concrete provider is **Google Gemini 3.1 Pro Preview** (released 2026-02-19), accessed via the Gemini API directly. Reasons:

- Best-in-class multimodal benchmarks for 2026 (MMMU-Pro 83.9; ~17% lead over GPT-5.5 on multimodal tasks).
- Trained natively end-to-end multimodal; vision is not a bolted-on module.
- 2.5x cheaper than GPT-5.5 on tokens ($2/$12 per 1M vs $5/$30), which matters for fixture iteration during a 3-day build.
- Production swap path is clean: same model is available via Vertex AI (FedRAMP High) for a hypothetical TTB production deployment.

Excluded providers and rationale:

- **Anthropic** — excluded by Chair on procurement grounds. F-042 records public reporting that the Trump administration ordered U.S. agencies to stop using Anthropic technology and that the Defense Secretary designated Anthropic as a supply chain risk; using Anthropic in a TTB-facing prototype would signal not having read the source material.
- **xAI Grok** — vision model is still labeled `grok-vision-beta` in 2026; xAI's investment is concentrated in image generation, not understanding. Not production-ready for reviewer-facing work.
- **OpenAI GPT-5.5** — viable fallback if Gemini setup friction blocks progress, but currently behind on multimodal benchmarks and 2.5x more expensive.

### Two-layer verification model

Verification is two-layer, per F-045 / REQ-011:

```text
Layer 1 (well-formedness): label vs TTB regulation
  - government warning exact text
  - mandatory-field presence
  - alcohol-content format
  - runs unconditionally, regardless of application data

Layer 2 (comparison): label vs application
  - per-field match / mismatch / needs_review
  - runs when application data is supplied; otherwise reports needs_application_data
```

Layer 1 and Layer 2 failures are reported separately in the UI and stored as separate result categories.

### Provider interface (binding)

`analyzeLabel` is on the provider; `verifyLabel` is **not** — it is domain logic that lives in `core/verification.ts` and operates on the provider's output:

```ts
// src/core/providers/types.ts
interface LabelProvider {
  analyzeLabel(image: Buffer): Promise<ExtractedFields>;
}

// src/core/verification.ts
function verifyLabel(args: {
  extracted: ExtractedFields;
  application: ApplicationData | null;
}): VerificationResult;  // includes both Layer 1 and Layer 2 results
```

This split keeps the provider interface narrow and makes the swap test simple: a different provider need only produce `ExtractedFields`. Layer 2 comparison is hybrid: deterministic for fields where TTB regulation requires exactness (warning text, ABV format, net contents normalization) and LLM-assisted for fields where compliance practice tolerates drift (brand name, class/type designation). LLM-assisted comparison reuses the same Gemini provider — no second vendor.

Do not let provider response shapes leak into the database or UI as the primary domain model. Normalize provider output into app-owned result types (`ExtractedFields`, `VerificationResult`).

## Deployment Shape

For the live VPS:

```text
nginx
  -> Node web/API process managed by PM2

PM2
  -> web/API process
  -> worker process

Docker
  -> Postgres
```

The app should expose configuration through environment variables:

- `DATABASE_URL`
- `PORT`
- `DATA_DIR`
- `INCOMING_DIR`
- `PROCESSING_DIR`
- `PROCESSED_DIR`
- `FAILED_DIR`
- model-provider API keys or local provider settings

For local reviewer deployment, prefer a documented flow like:

```sh
docker compose up -d db
npm install
npm run migrate
npm run dev
```

The exact scripts can change, but the goal is that a reviewer can either use the live deployment or run the app locally without reverse-engineering the environment.

### Live deployment target

The live URL is hosted on an existing Linode VPS owned by Chair, on the `foramerica.dev` domain (wildcard Let's Encrypt certificate already in place; no per-subdomain TLS work needed).

```text
host:    linode43393  (Linode 16 GB, US Dallas TX, 45.33.122.158)
url:     https://colacop.foramerica.dev
nginx:   already installed; reverse-proxies the Node API on a private port
pm2:     already installed; manages web/API and worker processes as
         separate apps under one ecosystem.config.cjs
postgres: docker compose up -d db (no native install on the box)
node:    nodenv-managed per the repo's .node-version
```

### Deploy mechanism

Manual SSH + git pull + build + reload. Chosen over CI/CD for speed-of-iteration during a 3-day build:

```sh
ssh root@linode43393.foramerica.dev
cd /opt/colacop
git pull
npm ci
npm run migrate
npm run build
pm2 reload ecosystem.config.cjs
```

The README captures these steps reviewer-side as "how the live deployment is updated"; the reviewer themselves only needs the URL.

### Coordination on the box

Linode 16 GB has plenty of headroom for Postgres-in-Docker alongside whatever else is running. Any pre-existing Postgres databases on the box that conflict with port 5432 may be shut down per Chair; the prototype's docker-compose binds to a non-default port if needed to coexist.

## Potential Problems

Postgres in Docker is heavier than SQLite. This is acceptable because the implementer is more familiar with Postgres, but the README must make local startup clear.

PM2/nginx is fine for the VPS, but it is not the same as the local development path. Avoid making graders install PM2 or nginx locally.

Filesystem watching can behave differently across operating systems and Docker-mounted volumes. Browser upload must feed the same queue path so graders can test ingestion even if directory watching is inconvenient in their environment.

Kysely query chains can grow long; keep database access functions small and named, and write migrations as plain SQL where it's clearer than the builder.

LLM/OCR calls may violate the intended 5-second agent-perceived latency if they run synchronously. Preserve the asynchronous queue model, and show queued/processing status clearly.

Provider-specific SDKs can spread quickly. Keep provider code isolated behind an app-owned interface.

Image quality handling can grow into a large computer-vision task. For the prototype, graceful detection and `needs_review` behavior is enough unless the requirements are explicitly expanded.

Government-warning validation has not yet been fully grounded in TTB regulatory sources. Do the targeted TTB pass before finalizing the strict warning rules.

## Current Assessment

There are no blocking problems with this stack for the assignment. The main risks are scope control and deployment clarity, not technical fit. The chosen stack supports the requirements well: asynchronous ingestion, persisted queue state, a review-focused UI, provider isolation, and a conventional deployment story.
