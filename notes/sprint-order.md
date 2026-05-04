# Sprint Order

Updated Monday 2026-05-04 by Tower (post cc-cm5 / cc-1s8 / cc-hy3 / cc-wrn merge).
Submission window open. Plan is now down to one mandatory bead and a handful of
polish-or-defer choices.

## Where we are

- **Today:** Monday 2026-05-04. Submission window open.
- **Closed since the morning replan:**
  - cc-2sa — live-reseed 3 demo fixtures on deploy and on Reset (shipped as live-reseed,
    not pre-extracted SQL — see "Implication for cc-lm6" below).
  - cc-cm5 — log HITL-decision-vs-tool-recommendation overrides as training-data signal.
  - cc-1s8 — race-free upsert (`INSERT ... ON CONFLICT (stem) DO UPDATE`).
  - cc-hy3 — rehydrate ExtractedFields from `layer1_results` rows on second-pass L2;
    halves Gemini cost on watcher path; **subsumes cc-uhc** (cross-restart cache case
    is now covered because rehydration reads from the database, not in-memory state).
  - cc-wrn — link CFR citations in verdict messages to ecfr.gov.
- **Closed during this final review:**
  - cc-uhc — closed as subsumed by cc-hy3.
  - cc-hfv — closed; `docs/handoff.md` moved to `docs/historical/` with a "superseded"
    preamble.

## Implication for cc-lm6

cc-2sa shipped as live-reseed: Reset clears state, drops 3 fixture pairs into the
watcher path, and Gemini extracts. This is a feature (the reviewer watches real
extraction in real time after a reset). But it means **the Reset button now triggers
3 simultaneous Gemini calls.** Original cc-lm6 was filed when 6 simultaneous calls
hit a 429; 3 is well under the 25 RPM cap and may be safe in practice. cc-lm6's
status depends on smoke-test outcome:

- **Smoke 5 resets in a row.** If any Reset 429s a job, ship cc-lm6 (~30 min).
- **If all 5 are clean,** demote cc-lm6 to P2 README known-limitation.

## Tier ranking (final)

### Tier 1 — must ship before submit

| ID | P | Why |
|---|---|---|
| `cc-64v` | 1 | README polish + screenshots + framing throughout + known-limitations inventory. Mandatory final deliverable. ~1-2h Tower/Chair. |

### Tier 2 — strong polish, do before README

| ID | P | Why |
|---|---|---|
| `cc-htd` | 1 | 2-3 high-leverage edge fixtures (front-only crop → missing-warning L1; lowercase warning → warning-violation L1; bad-photo → low-confidence demo, especially relevant post-cc-ye9). All derivable from existing bottles via crop/edit. ~1-2h Chair image work. Sharpens the failure-mode story. |
| `cc-fsa` | 2 | Smoke-verify (5 min): open cointreau / rumple post-redeploy, confirm `alcoholContent` extracted_value contains `(80 PROOF)` / `(100 PROOF)`. Likely already fixed by cc-7v3 verbatim prompt. Close or document. |
| `cc-lm6` | 1 | Smoke-conditional (see "Implication for cc-lm6" above). Smoke 5 resets; ship if any 429, otherwise demote to README. |

### Tier 3 — stretch (only if Tier 2 lands and time remains)

| ID | P | Why |
|---|---|---|
| `cc-9wh` | 2 | Multi-select upload. Reviewer convenience for batch-pair drops. ~45 min. **Ship only with cc-lm6** — multi-select makes 429 user-visible. |
| `cc-55c` | 2 | L2 column-table polish. cc-o1k already exposed extracted-vs-application data per row; this is layout. ~30-45 min. |

### Tier 4 — README known-limitations (no code change)

| ID | P | Documented as |
|---|---|---|
| `cc-egk` | 2 | Worker single-writer guarantee — PM2 enforces in production; dev-only concern. |
| `cc-g87` | 2 | Stub-provider fallback has no in-UI cue; only triggers on misconfigured GEMINI_API_KEY. Live URL has the key set. |
| `cc-lm6` | 1 → 2 | If smoke shows reset is reliable, document as: "high-burst seed of 6+ simultaneous extractions can hit Gemini 25 RPM; production load is one upload at a time, and Reset handles 3 within burst tolerance." |

## Monday sequence

```
NOW       redeploy live URL to pick up cc-cm5 / cc-1s8 / cc-hy3 / cc-wrn / cc-2sa.
SMOKE     localhost first, then live URL:
            - All 6 bottles produce sensible verdicts (cc-0ue / cc-ye9 / cc-srj).
            - Decision UI works end-to-end with adjudication framing (cc-syy).
            - Override badge appears on diverged decisions (cc-cm5).
            - CFR citations are clickable and resolve (cc-wrn).
            - Reset 5x in a row; check for 429 (cc-lm6 decision gate).
            - cc-fsa verify: cointreau / rumple ABV extracted_value includes proof tail.
NEXT      cc-htd — 2-3 edge fixtures (Chair image work, ~1-2h).
THEN      cc-64v — README polish + screenshots + framing + known-limits (~1-2h).
LATE      Final smoke on live URL; submit.
```

## Cuts available if Monday slips

In rough order of preference:

1. **Skip cc-htd edge fixtures.** The 6 real bottles + cc-2sa pre-seed +
   reviewer-driven mismatched-pair uploads already cover the failure-mode story
   end-to-end. Edge fixtures sharpen but aren't required.
2. **Skip cc-9wh + cc-55c.** Tier 3 by definition.
3. **Skip cc-lm6.** If smoke is reliable, README documents the burst limit.

If all three cuts apply, the demo is still credible: live URL with seeded queue,
decision UI with adjudication framing, override-detection signal, real Gemini
extraction, regulation-grounded verdicts, transparent extracted values, clickable
CFR citations, reviewer-driven upload + mismatched-pair failure demo,
README that frames the tool correctly and enumerates known limits.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev.
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 closed).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (cc-syy closed). Override-detection logs HITL-vs-tool divergence (cc-cm5 closed).
- **Per-finding scope:** Option A — label-level decisions only, no per-finding overrides. cc-q25 closed.
- **Reviewer onboarding:** populated queue on landing via live-reseed of 3 demo fixtures (cc-2sa); upload-driven workflow with downloadable fixtures (cc-1c5); reset-to-demo as discreet secondary affordance (cc-1c5 / cc-idm).
- **Verbatim Gemini prompt:** cc-7v3 chose verbatim-extraction. Verification logic absorbs common verbatim patterns per cc-0ue.
- **Tool positioning:** agent-assisted COLA pre-review, not COLA review. Tool = recommendation/screening; HITL = reviewer/adjudicator. ARCHITECTURE.md "Tool Positioning & Vocabulary" is canonical.
- **Citations:** verdict messages link CFR citations to ecfr.gov (cc-wrn).
- **Known-limitation pattern:** deferred bugs (cc-egk, cc-g87, cc-lm6 if smoke-clean) are transparently documented in README rather than fixed. cc-64v carries this.

## Open issue inventory

| ID | P | Type | Status | Notes |
|---|---|---|---|---|
| cc-64v | 1 | task | open | TIER 1 FINAL — README. |
| cc-htd | 1 | task | open | TIER 2 — 2-3 edge fixtures. |
| cc-lm6 | 1 | bug | open | TIER 2 — smoke-conditional; ship or document. |
| cc-fsa | 2 | task | open | TIER 2 — smoke-verify and close. |
| cc-9wh | 2 | task | open | TIER 3 — multi-upload (with cc-lm6 only). |
| cc-55c | 2 | task | open | TIER 3 — L2 column polish. |
| cc-egk | 2 | chore | open | TIER 4 — README known-limitation. |
| cc-g87 | 2 | bug | open | TIER 4 — README known-limitation. |
