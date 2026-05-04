# Sprint Order

Updated Monday 2026-05-04 by Tower (final-final). Open queue down to 4 beads.

## Where we are

- **Today:** Monday 2026-05-04. Submission window open.
- **Closed in this final review pass:**
  - cc-htd — deferred indefinitely; 6 real bottles + cc-2sa pre-seed + reviewer mismatched-pair uploads cover the failure-mode story without dedicated edge fixtures.
  - cc-fsa — subsumed by cc-7v3 verbatim prompt (proof tail retained).
  - cc-lm6 — smoke confirmed: 3-fixture reset stays under Gemini's 25 RPM burst tolerance. Documented in README; backoff deferred until a real load pattern (e.g. multi-select upload) requires it.
  - cc-9wh — not building multi-select. Replaced by cc-ky5 (one-line UI hint pointing local reviewers at `data/incoming/`).
  - cc-55c — effectively done. JobDetailView L2 rows already render field/verdict/message/extracted/application inline (App.tsx ~649). The literal table layout the bead asked for is a CSS restructure of identical data; current card form is more readable.
- **Earlier in the day:** cc-uhc closed (subsumed by cc-hy3); cc-hfv closed (handoff.md moved to docs/historical/).

## The remaining 4 beads

### Tier 1 — must ship before submit

| ID | P | Why |
|---|---|---|
| `cc-64v` | 1 | README polish + screenshots + framing throughout + known-limitations inventory + local-setup instructions (including the watcher-drop hint cc-ky5 introduces). Mandatory final deliverable. ~1-2h Tower/Chair. |

### Tier 2 — small additions (do alongside or before README)

| ID | P | Why |
|---|---|---|
| `cc-ky5` | 2 | One-line UI hint: "Running locally? You can also drop pairs into `data/incoming/` — the watcher picks them up automatically." ~10 min Trench. README cc-64v references the same path. |

### Tier 3 — close after pre-submit deploy verification

These two are documented as "no fix, defensive design only." They close once the
deploy + reboot smoke passes; if either smoke step fails, address before submit.

| ID | P | Closure gate |
|---|---|---|
| `cc-egk` | 2 | PM2 ecosystem manages a single worker process. **Verify:** ssh to box, `pm2 stop all && pm2 start ecosystem.config.cjs`, observe both web and worker come back up cleanly with no double-worker race. **Or simpler:** `pm2 reload ecosystem.config.cjs` and confirm `pm2 list` shows exactly one of each. Then close as "production single-writer enforced by PM2; documented." |
| `cc-g87` | 2 | Live URL must have `GEMINI_API_KEY` set so the worker uses real Gemini, not the stub fallback that returns merlot for everything. **Verify:** ssh to box, check `/opt/colacop/.env.production` (or wherever the env lives) contains `GEMINI_API_KEY=...`; check pm2 worker logs for `[worker] provider: GeminiLabelProvider` (not `StubLabelProvider`); upload a known fixture and confirm the extracted values match the bottle, not the merlot stub. Then close as "production env verified; documented." |

## Pre-submit verification checklist (Chair)

```
1. Deploy: ssh + git pull + npm ci + npm run migrate + npm run build + pm2 reload.
2. Verify worker provider line in PM2 logs reads GeminiLabelProvider (closes cc-g87).
3. pm2 reload (or stop/start); verify single web + single worker (closes cc-egk).
4. Smoke live URL: 6 bottles render, decisions land, override badge appears,
   CFR citations resolve, reset works, fixtures download works, upload works.
5. Submit.
```

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev.
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 closed).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (cc-syy closed). Override-detection logs HITL-vs-tool divergence (cc-cm5 closed).
- **Per-finding scope:** Option A — label-level decisions only, no per-finding overrides (cc-q25 closed).
- **Reviewer onboarding:** populated queue on landing via live-reseed of 3 demo fixtures (cc-2sa); upload-driven workflow with downloadable fixtures (cc-1c5); reset-to-demo as discreet secondary affordance (cc-1c5 / cc-idm); local-installation watcher-drop hint (cc-ky5).
- **Verbatim Gemini prompt:** cc-7v3 chose verbatim-extraction. Verification logic absorbs common verbatim patterns per cc-0ue.
- **Tool positioning:** agent-assisted COLA pre-review, not COLA review. Tool = recommendation/screening; HITL = reviewer/adjudicator. ARCHITECTURE.md "Tool Positioning & Vocabulary" is canonical.
- **Citations:** verdict messages link CFR citations to ecfr.gov (cc-wrn closed).
- **Multi-select upload:** explicitly not implemented; reviewers wanting batch ingestion use the local watcher-drop path. The browser upload form remains one-pair-at-a-time (cc-9wh closed).
- **Edge fixtures:** explicitly deferred; the 6 real bottles + reviewer-driven mismatched-pair uploads cover the failure-mode story (cc-htd closed).
- **Gemini 429 backoff:** explicitly deferred; reset's 3-fixture burst stays under tolerance, no production load pattern triggers it. Documented (cc-lm6 closed).
- **Known-limitation pattern:** cc-egk and cc-g87 are documented in README, not fixed; closure gated on the pre-submit deploy verification.

## Open issue inventory

| ID | P | Type | Status | Notes |
|---|---|---|---|---|
| cc-64v | 1 | task | open | TIER 1 FINAL — README. |
| cc-ky5 | 2 | task | open | TIER 2 — UI watcher-path hint (replaces cc-9wh). |
| cc-egk | 2 | chore | open | TIER 3 — close after PM2 single-writer verification. |
| cc-g87 | 2 | bug | open | TIER 3 — close after live-env Gemini-key verification. |
