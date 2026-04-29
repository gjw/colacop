# Architecture

This document records the current implementation direction. It is not a final design spec; it captures the stack and architecture we intend to start from based on the facts and requirements already extracted.

## Chosen Stack

The prototype should be built with:

- Node.js 24.x
- TypeScript
- React + Vite for the browser UI
- Express for the HTTP API
- Zod for runtime validation at application boundaries
- Postgres running through Docker Compose
- Knex for SQL migrations, query construction, and database access
- Chokidar for filesystem watching
- PM2 for long-running production processes on the VPS
- nginx as the public reverse proxy

Node 24.x is an appropriate target because it is the current Active LTS line. Use `24` or `24.x` in local/tooling documentation rather than pinning application code to a specific patch release unless the build process needs exact reproducibility.

Use `nodenv` to lock the local Node version for the repo, likely through a committed `.node-version` file. Workflow should be tracked with `br` (`beads_rust`) and viewed with `bv`; note that `br sync --flush-only` exports bead state but does not run git commands, so `.beads/` changes must be committed explicitly when bead state is part of a commit.

## Why This Stack

TypeScript is the safest language choice for this assignment. It is familiar to reviewers, strongly supported by current coding tools, and works well across the UI, API, worker, validation, and shared domain types.

React with Vite gives us a straightforward frontend without pulling the project into a full-stack framework whose assumptions may not match a long-running worker process. The app is workflow-heavy rather than content-heavy, so a small React SPA backed by an API is enough.

Express is preferred over Fastify because the implementer is more familiar with it and the app does not need Fastify's performance or schema features. Express is conventional, easy to review, and fast enough for this workload.

Zod gives us explicit runtime validation for API payloads, worker inputs, model-provider responses, and parsed result objects. TypeScript alone is not enough at these boundaries because files, database rows, uploads, and LLM/OCR outputs are runtime data.

Postgres in Docker is acceptable even though SQLite would also be enough. Postgres is familiar to the implementer, production-shaped, and useful for persisted queue state, JSON result payloads, and review records. Docker Compose keeps local setup reasonable for graders.

Knex is a pragmatic middle ground between raw `pg` and an ORM. It gives us migrations and explicit database access without adopting a heavy object model. SQL should still remain visible and understandable; avoid hiding the data model behind deep abstractions.

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
- write uploads into the ingestion path or directly create equivalent queued jobs
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
    knex.ts
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

The model/OCR layer should sit behind a small interface. The application should not be hard-coded throughout to a single provider.

This is motivated by:

- network restrictions and blocked cloud endpoints
- prior vendor-pilot failures
- Anthropic-specific supply-chain/procurement risk
- general risk from depending on a single external model provider

The first implementation can have one provider, but the boundary should make replacement plausible:

```text
analyzeLabel(input) -> extracted fields + evidence/confidence
verifyLabel(application data, extracted fields) -> per-field results
```

Do not let provider response shapes leak into the database or UI as the primary domain model. Normalize provider output into app-owned result types.

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

## Potential Problems

Postgres in Docker is heavier than SQLite. This is acceptable because the implementer is more familiar with Postgres, but the README must make local startup clear.

PM2/nginx is fine for the VPS, but it is not the same as the local development path. Avoid making graders install PM2 or nginx locally.

Filesystem watching can behave differently across operating systems and Docker-mounted volumes. Browser upload must feed the same queue path so graders can test ingestion even if directory watching is inconvenient in their environment.

Knex can become opaque if query-builder chains replace clear SQL thinking. Keep migrations explicit and keep database access functions small.

LLM/OCR calls may violate the intended 5-second agent-perceived latency if they run synchronously. Preserve the asynchronous queue model, and show queued/processing status clearly.

Provider-specific SDKs can spread quickly. Keep provider code isolated behind an app-owned interface.

Image quality handling can grow into a large computer-vision task. For the prototype, graceful detection and `needs_review` behavior is enough unless the requirements are explicitly expanded.

Government-warning validation has not yet been fully grounded in TTB regulatory sources. Do the targeted TTB pass before finalizing the strict warning rules.

## Current Assessment

There are no blocking problems with this stack for the assignment. The main risks are scope control and deployment clarity, not technical fit. The chosen stack supports the requirements well: asynchronous ingestion, persisted queue state, a review-focused UI, provider isolation, and a conventional deployment story.
