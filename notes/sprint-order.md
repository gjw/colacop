# Sprint Order

Updated 2026-05-01 13:00 by Tower (replan after Chair correction on date + scope).

## Where we are

- **Today:** Friday 2026-05-01, ~13:00.
- **Effective deadline:** Monday 2026-05-04, end of day. Email said "within one week"; user received email on Monday 2026-04-27, so safest read is Monday EOD.
- **Target ship:** Friday night 2026-05-01 if possible, with Saturday for review buffer; submit Sunday or first thing Monday. Reviewers may not look over the weekend.
- **xog status:** Trench shipped a working prototype with stub `analyzeLabel`. UI loads. Watcher accepts dropped pairs. Chair has not yet audited the built code against any use case (UC-001 was never written before xog was built — see friction.md F5).

## What's next, in order

The next two sessions are both Tower-shaped, and Chair will spawn a fresh Tower for each:

1. **cc-fk3 — Author UC-001 in design/use-cases.yaml.** Cockburn-style, ONE main use case with rich extensions. Anchored in source material (interviews + facts + requirements), not in the running app. The point is to describe the agent's goal independent of how the prototype currently happens to support it. Acceptance and design notes are on the bead.

2. **cc-jhk — Scope pass + audit + gap-bead generation.** Depends on cc-fk3. Marks each UC-001 step + extension as WILL/WON'T/MAYBE for the Monday submission, runs a structured audit on the running prototype (functional + use-case-alignment), and files gap beads. Outputs land in notes/scope-may-2026.md and notes/audit-2026-05-01.md.

After cc-jhk, the queue will be a deterministic list of gap beads ordered against the time remaining. Execution happens in Trench sessions from there.

## Strawman scope for UC-001 (subject to cc-jhk review)

This is a starting point for the WILL/WON'T/MAYBE pass, not a commitment. cc-jhk's first step is to revisit each entry against the actual UC-001.

### WILL (non-negotiable for Monday submission)

- Drop a paired image + JSON into `data/incoming/` → job appears in UI within seconds with Layer 1 + Layer 2 per-field results populated.
- Real Gemini call wired (not stub) — `analyzeLabel` returns honest extracted fields from the image.
- Layer 1 + Layer 2 visually distinguishable in UI; per-field verdict + reason visible.
- Live URL accessible and stable.
- README that lets the reviewer run locally without reverse-engineering anything.
- Realistic fixtures exist (cc-htd) and exercise the main paths (clear match, mismatch, brand drift, warning violation, unreadable image).
- 5-second perceived latency for opening a job (already true if processing is async — verify in audit).

### SHOULD (do if WILL is in the bag)

- Browser upload UI for paired or label-only submission.
- LLM-assisted Layer 2 for brand/class/type drift.
- `extraction_confidence` per-field badge populated by Gemini logprobs/self-rating, not stubbed.
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

## Open question — empty queue on the live URL

A reviewer hitting colacop.foramerica.dev should not see an empty queue. Multiple solutions are plausible:

- Pre-load fixtures into the deployed instance so results are visible on first load.
- Show a helpful empty-state with a link to public example fixtures and a "drop a pair into data/incoming/ to try" message.
- Both.

Chair will decide during cc-jhk. Not committing now.

## Non-concerns

- **API cost.** $25 budget covers comfortably more than the demo will need. Not a constraint on architecture or fixtures.
- **Time estimates.** Removed; consistently wrong. Order things by dependency, not by hours.

## Open issues post-replan

- **cc-xog** [in_progress] — pending cc-jhk audit, then closed (all-pass) or kicked to fixes (any fail).
- **cc-fk3** [open, P0, ready] — UC-001 authoring; next Tower session.
- **cc-jhk** [open, P0, blocked-by cc-fk3] — scope + audit pass; Tower session after that.
- **cc-htd** [open, P1, ready] — fixtures; can run in parallel with Gemini wiring once both are beaded into Trench tasks after audit.
- **cc-64v** [open, P1, blocked-by cc-xog] — README polish; near-final task.
- **cc-hfv** [open, P2] — handoff doc drift; defer unless slack permits.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.1 Pro Preview via direct Gemini API (cc-7qe closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers, per F-045 / REQ-011. Layer 1 well-formedness runs unconditionally; Layer 2 comparison runs when application data is supplied. Hybrid: deterministic for fields TTB requires exact, LLM-assisted (same provider) for fields with tolerated drift.
- **Input frame interpretation:** label image + application data (F-044).
- **Input pairing model:** filename-stem pairing, one-to-one, JSON for application data, re-pair on later sibling arrival (F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed). Manual ssh + git pull deploy.
- **TTB regulatory grounding:** F-047 (warning exact text), F-048 (GOVERNMENT WARNING caps + bold), F-051/F-053/F-054 (mandatory-field rules), F-052 (wine ABV format/tolerance), F-056 (extraction_confidence buckets), F-057 (same-stem replacement out of scope) — all landed via cc-5ea.

## What is not yet a bead (filed after audit)

- Real Gemini wiring (replace stub `analyzeLabel`).
- Empty-queue solution (whichever direction Chair picks).
- Linode deploy dry-run + nginx vhost + PM2 ecosystem config.
- Whatever WILL gaps the audit surfaces.
