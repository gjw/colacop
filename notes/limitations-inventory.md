# Limitations inventory (G3 output)

Source: `br show` of cc-egk, cc-g87, cc-lm6, cc-uhc, cc-htd, cc-9wh, cc-1s8, cc-hy3, cc-q25.
Drives the "Known limitations" + "Things the system handles" + "Scope decisions" blocks in cc-64v's README rewrite.

## A. Current limitations (README "Known limitations")

### Single-writer worker is operational, not enforced in code (cc-egk)

Worker startup does not take an advisory lock on `DATABASE_URL`/`INCOMING_DIR`. PM2 manages a single worker on the live VPS, so production is safe. Locally, running `npm run dev:worker` twice against the same DB+dir will race and silently produce mixed Layer 1 / Layer 2 results.

**Mitigation:** PM2 ecosystem in production. Locally, run only one worker.

### Stub-provider fallback is silent in the UI (cc-g87)

When `GEMINI_API_KEY` is unset or empty the worker logs `[worker] provider: StubLabelProvider (GEMINI_API_KEY not set)` and uses canned fixture extractions. The UI does not surface which provider produced a given row. Production verified to use `GeminiLabelProvider`; local reviewers without a key need to read the worker log to know they're seeing stub data.

**Mitigation:** documented; production verified by PM2 log inspection.

### No backoff on Gemini 429 RESOURCE_EXHAUSTED (cc-lm6)

`gemini-3.1-pro` enforces 25 RPM regardless of spend. The worker does not retry; a burst that trips the limit fails the affected jobs with `lifecycle: failed` and the raw 429 JSON in `failure_reason`. The 3-fixture demo seed stays well under in practice. Rapid reviewer uploads could trip it.

**Mitigation:** 3-pair demo seed sized to stay under quota; burst behavior documented.

## B. Hardened-against historical (README "Things the system handles correctly")

Short, neutral mentions — these are bugs we ran into and fixed during the build; reviewers don't need to know the bug, they need to know the property holds.

- **Race-free job upsert under burst arrival.** Chokidar can fire `add` events for the same stem in quick succession; `upsertJob` uses `INSERT ... ON CONFLICT (stem) DO UPDATE` so concurrent events serialize at the DB. (cc-1s8.)
- **No double extraction across the JSON-after-image path or worker restart.** Second-pass processing rehydrates `ExtractedFields` from persisted `layer1_results` rows rather than re-calling Gemini. (cc-uhc → cc-hy3, commit 28b4fbe.)

## C. Deferred design / scope decisions (README "Scope decisions")

Phrased as design choices, not bugs.

### Fixture set is six real bottles (cc-htd)

An exhaustive edge-case matrix — intentional warning violation, missing-back-panel-only, deliberately bad photography — was scoped out. Reviewers exercise these scenarios by uploading mismatched pairs through the UI (e.g. `fireball.jpg` + `rumple.json`) or by photographing edge cases themselves and uploading.

### Browser upload is one pair at a time (cc-9wh)

Multi-select on the upload form was scoped out. Batch ingestion uses the watched directory `data/incoming/`; the UI surfaces this path (cc-ky5 hint) for local-install reviewers who want to drop many pairs at once.

### Adjudication is label-level only (cc-q25)

The reviewer's decision unit is one label → one decision (approve / reject / send_back). Per-finding overrides — e.g. "I accept this brand drift" or "I reject this ABV mismatch as hard fail" — are deliberate future work. The data model supports them (`extracted_value` is per-row; verdict is per-field) but the prototype keeps the adjudication boundary at the label.

## Drafting hints for phase 2

- Group the README by these three buckets, in this order. Bucket A is what reviewers most need to know; B reassures them that obvious worries are handled; C heads off "why didn't you do X?" questions.
- Don't mention bead IDs in the README itself — those are internal. Reference commits where useful (`commit 28b4fbe`) for verifiable provenance.
- Bucket B should be ~3 lines total. Don't over-explain.
- Bucket C should foreground the scope decision, not the absence. "Browser upload is one pair at a time; batch goes through the watched directory" is the right shape — not "we didn't build multi-select."
