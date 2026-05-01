# Sprint Order

Updated 2026-04-30 by Tower (replan after xog landed). Hard external deadline 2026-05-02.

## Where we are

xog has shipped. Stub provider; no Gemini wiring yet. Front-end loads. Watcher accepts dropped pairs. Chair has not yet audited the built code against the use case. Five Tower-shaped P0 decisions are closed; cc-5ea also closed (regulatory pass landed during xog work). Open issues: cc-xog (in progress, ready to mark complete after audit), cc-htd, cc-fk3, cc-64v, cc-hfv.

## Replan rationale

Earlier sequence (scz → xog → 4fk → 5ea → reevaluate) is largely done. The reevaluate step is now. Chair's correct instinct: do not generate more tickets against an unverified ground state. Audit first, then plan.

## Tomorrow's sequence (2026-04-30 → 2026-05-02)

1. **Use case authoring (cc-fk3).** Tower-shaped. Draft UC-001 (Verify alcohol label application) Cockburn-style from source material only — do not look at the running app. Main success scenario as numbered steps; extensions per the candidate list in `docs/handoff.md`. ~1-2 hours.

2. **Scope pass.** Within UC-001, mark each step + extension as **WILL** / **WON'T** / **MAYBE** for the May 2 submission. Strawman in this file (see below); Chair to react. ~30 minutes.

3. **Audit, on two axes.**
   - *Functional:* walk xog's 8 acceptance criteria; mark each pass / partial / fail / unverified.
   - *Use-case alignment:* walk UC-001 WILL steps; for each, does the built UI/data model/lifecycle make the agent's goal achievable?

   ~1-2 hours combined. Chair drives, Tower assists.

4. **Generate gap beads.** Each WILL gap → P0. Each SHOULD gap → P1. Each MAYBE that didn't fit → P3. ~30 minutes.

5. **Execute remaining critical path.** In order:
   - Real Gemini wiring (replace stub `analyzeLabel`) — Trench, ~2-4 hours.
   - Fixtures (cc-htd) — Trench, ~2-4 hours; can run in parallel with Gemini wiring.
   - Pre-load fixtures into prod DB at deploy time — Trench, ~1-2 hours.
   - WILL gap fixes from audit — wildcard.
   - Deploy dry-run on Linode — Trench/Chair, ~2-4 hours (always longer than expected).
   - README + scope-doc polish (cc-64v) — Tower or Trench, ~1-2 hours.
   - Final smoke test on live URL — Chair, ~30 minutes.

## Strawman scope for UC-001 (Chair reacts in the morning)

### WILL (non-negotiable for May 2)

- Drop a paired image + JSON into `data/incoming/` → job appears in UI within seconds with Layer 1 + Layer 2 per-field results populated.
- Real Gemini call wired (not stub) — `analyzeLabel` returns honest extracted fields from the image.
- 5-8 realistic fixtures pre-loaded on the live deployment so the queue is not empty when a reviewer arrives.
- Layer 1 + Layer 2 visually distinguishable in UI; per-field verdict + reason visible.
- Live URL accessible and stable.
- README that lets the reviewer run locally without reverse-engineering anything.
- 5-second perceived latency for opening a job (already true if processing is async — verify in audit).

### SHOULD (do if WILL is in the bag)

- Browser upload UI for paired or label-only submission (assignment doesn't strictly require, but missing it makes the demo feel watcher-only).
- LLM-assisted Layer 2 for brand/class/type drift (architecture documented; defer if slow).
- `extraction_confidence` per-field badge actually populated by Gemini logprobs/self-rating, not stubbed.
- Image-quality / unreadable-label graceful degradation visible in fixtures.
- Re-pair on later sibling arrival (already in xog acceptance #4 — verify in audit).

### WON'T (explicit, documented in README)

- Same-stem replacement (F-057).
- Out-of-band application-data fetch by COLA filing ID.
- Zip+manifest or other bundled ingestion.
- Multi-label per application.
- Auth, PII handling, audit logs.
- Production-grade error reporting beyond `failed` lifecycle.
- COLA integration in any direction.

## Constraints discovered during replan

**Empty-queue problem.** A reviewer who hits colacop.foramerica.dev should not see an empty queue. Fixtures must be **pre-loaded into the deployed instance**. This is a constraint on cc-htd (fixtures must be checked in) and on the deploy workflow (run fixtures through the watcher at deploy time, or seed the DB).

**Reviewer-burning-API-credits problem.** Live Gemini calls per reviewer click cost real money. Recommend pre-compute-and-store: fixtures get processed once at deploy time, results live in the DB, live ingestion is feature-flagged off in production (or rate-limited). README documents that live ingestion works locally. Reviewer gets real, deterministic experience; Chair doesn't pay for clicks.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.1 Pro Preview via direct Gemini API (cc-7qe closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers, per F-045 / REQ-011. Layer 1 well-formedness runs unconditionally; Layer 2 comparison runs when application data is supplied. Hybrid: deterministic for fields TTB requires exact, LLM-assisted (same provider) for fields with tolerated drift.
- **Input frame interpretation:** label image + application data (F-044).
- **Input pairing model:** filename-stem pairing, one-to-one, JSON for application data, re-pair on later sibling arrival (F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed). Manual ssh + git pull deploy.
- **TTB regulatory grounding:** F-047 (warning exact text), F-048 (GOVERNMENT WARNING caps + bold), F-051/F-053/F-054 (mandatory-field rules), F-052 (wine ABV format/tolerance), F-056 (extraction_confidence buckets), F-057 (same-stem replacement out of scope) — all landed via cc-5ea.

## Open issues post-replan

- **cc-xog** [in_progress] — pending Chair audit, then close.
- **cc-fk3** [open, ready] — UC-001 authoring; tomorrow morning's first action.
- **cc-htd** [open, ready] — fixtures; do in parallel with Gemini wiring.
- **cc-64v** [open, blocked-by cc-xog] — README polish; near-final task.
- **cc-hfv** [open, P2] — handoff doc drift; defer unless time slack permits.

## What is not yet a bead

These will be filed after the audit:

- Real Gemini wiring (replace stub analyzeLabel).
- Pre-load fixtures into production DB at deploy time.
- Linode deploy dry-run + nginx vhost + PM2 ecosystem config.
- Possibly: feature-flag live ingestion off in production.
- Whatever WILL gaps the audit surfaces.
