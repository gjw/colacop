# Sprint Order

Updated 2026-04-29 by Tower. Hard external deadline 2026-05-02.

## Committed sequence

1. **cc-scz** — Repo scaffolding (TS, Node 24, Kysely + pg, docker-compose for Postgres, .gitignore, .node-version, tsconfig, npm scripts including a tsx-based migrate runner). Trench-shaped. Single session.
2. **cc-xog** — Vertical slice: ingestion path, worker, stub `analyzeLabel` provider, stub `verifyLabel` returning fixed Layer 1/Layer 2 results, minimal review UI. No real Gemini call yet — the slice exists to prove the seams. Trench-shaped.
3. **cc-4fk** — Pick deployment target. Chair has already chosen the target; this issue is *documentation only*: write the choice into ARCHITECTURE.md and add deploy steps to README. Confirm specifics with Chair before writing.
4. **cc-5ea** — TTB regulatory mini-pass. Add 1-2 source files (S-006, S-007), extract regulation-backed facts (F-046+) for warning text, mandatory fields, ABV format. Update REQ-011's `supported_by` to cite these new facts. Update REQ-005's `supported_by` likewise.
5. **Reevaluate.** After 1-4 land, re-run `bv --robot-triage` and pick the next critical-path step. Likely candidates: real Gemini wiring inside the provider boundary (replacing the stub from cc-xog), TTB-rule check implementations driven by the new facts, fixture work (cc-htd), or deployment dry-run.

## Parallelism opportunities

- `cc-htd` (sample-label fixtures) has no dependency on the critical path and can run in parallel with `cc-scz` or `cc-xog` if a second Trench session is available. Worth doing early so `cc-xog`'s stub can produce realistic-looking review-UI output for demo purposes.
- `cc-5ea` is also independent of scaffolding; if Chair wants to spin up a second Trench, this is a clean parallel track.

## Decisions locked this session

- **SQL access library:** Kysely. Closed `cc-ff6`. ARCHITECTURE.md and `cc-scz` design notes updated.
- **Model provider:** Google Gemini 3.1 Pro Preview, via the Gemini API directly. Closed `cc-7qe`. ARCHITECTURE.md > Model Provider Boundary updated with the choice, exclusions (Anthropic on procurement grounds; xAI on beta-status grounds), production-swap path (Vertex AI Government / Azure / Bedrock), and the tightened interface (analyzeLabel on provider; verifyLabel is domain logic).
- **Verification model:** two layers, per F-045 / REQ-011. Layer 1 (well-formedness) runs unconditionally; Layer 2 (comparison) runs when application data is supplied. Layer 2 is hybrid — deterministic for fields TTB requires exact (warning text, ABV format, net contents), LLM-assisted via Gemini for fields tolerated drift in (brand name, class/type).
- **Input frame interpretation:** label image + application data. The assignment header is silent on this; F-044 records the committed interpretation so future readers do not silently re-derive a different scope.
- **Input pairing model:** filename-stem pairing (`42.jpg` + `42.json`), one-to-one, JSON for application data, files in a pair may arrive in either order with re-pairing on later arrival (image-first: Layer 1 runs immediately, Layer 2 re-runs when JSON arrives; JSON-first: held in `awaiting_label` until image arrives). Recorded in F-046, REQ-012, and ARCHITECTURE.md > Input Pairing.

## Open dependencies after this session

- `cc-xog` no longer depends on `cc-7qe` (removed 2026-04-29; the slice uses a stub provider).
- `cc-xog` still depends on `cc-scz`.
- `cc-fk3` (use cases) still depends on `cc-5ea`.
- `cc-64v` (README polish) still depends on `cc-4fk` and `cc-xog`.
- `cc-hfv` (handoff drift reconciliation) is P2 — defer until reevaluate.
