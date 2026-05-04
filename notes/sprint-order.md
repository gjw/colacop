# Sprint Order

Updated Monday 2026-05-04 by Tower (post cc-syy + cc-0ue + cc-ye9 + cc-srj merge).
Hard deadline EOD; daylight available — expanded scope vs Sunday's plan.

## Where we are

- **Today:** Monday 2026-05-04. More buffer than Sunday's plan assumed.
- **Closed since Sunday's replan:**
  - cc-0ue — fixture audit + verbatim verdict-tolerance fixes.
  - cc-ye9 — decoupled low-confidence from L1 verdict.
  - cc-srj — per-field needs_application_data on partial JSON.
  - cc-syy — decision UI (approve / reject / send_back) + adjudication framing.
- **New positioning lock-in (this morning):**
  - ARCHITECTURE.md gained "Tool Positioning & Vocabulary" section. Tool = recommendation/screening; HITL = reviewer/adjudicator. Vocabulary table + "right about why it might be wrong" framing. cc-syy shipped with this language; cc-64v carries it through the README.
- **Beads filed since Sunday:**
  - cc-9wh (P2) — multi-select upload.
  - cc-2sa (P1) — pre-seed 3 fixtures (Trench in progress).
  - cc-cm5 (P1, was P2) — log HITL-decision-vs-tool-recommendation overrides.
  - cc-wrn (P1) — link CFR citations in verdict messages to ecfr.gov.
- **Promotions this morning (more daylight than Sunday assumed):**
  - cc-cm5 P2 → P1: Treasury-CIO-relevant, small (~45 min), don't ship cc-syy without it.
  - cc-1s8 P2 → P1: trivial fix (`INSERT ... ON CONFLICT (stem) DO UPDATE`); removes log noise.
  - cc-hy3 P2 → P1: small (~30 min); halves Gemini cost on watcher path.
  - cc-htd narrowed: 2-3 high-leverage edge fixtures, not the original 5-6.

## Tier ranking (Monday-final)

### Tier 1 — must ship before submit

| ID | P | Why |
|---|---|---|
| `cc-2sa` | 1 | Pre-seed 3 cleanest fixtures so reviewer lands on populated queue. Trench in progress. |
| `cc-cm5` | 1 | Override-detection: HITL-decision-vs-tool-recommendation logged. Small; operationalizes the "overrides are valuable signal" Treasury-CIO point. |
| `cc-64v` | 1 | README polish + screenshots + known-limitations + framing throughout. Mandatory final deliverable. |

### Tier 2 — strong polish (small wins, high payoff)

| ID | P | Why |
|---|---|---|
| `cc-1s8` + `cc-hy3` | 1 | Worker-correctness batch. ~45 min combined. Removes log noise + halves Gemini cost on watcher. |
| `cc-wrn` | 1 | Link CFR citations to ecfr.gov. ~30 min. Makes the "evidence-rich recommendation" framing tangible. |
| `cc-fsa` | 2 | Verify during localhost smoke (5 min). Likely already fixed by cc-7v3 verbatim prompt. Close or document. |
| `cc-hfv` | 2 | Delete or move docs/handoff.md (5 min Tower). README doesn't link to it. |
| `cc-htd` | 1 | 2-3 high-leverage edge fixtures: front-only crop (missing-warning), lowercase warning, bad-photo (low-confidence). All derivable from existing bottles. ~1-2h Chair image work. |

### Tier 3 — stretch (only if everything above lands and time remains)

| ID | P | Why |
|---|---|---|
| `cc-9wh` + `cc-lm6` | P2 / P1 | Multi-select upload + 429 retry batch. ~1.5h. Multi-select makes 429 a real risk; ship together or skip together. |
| `cc-55c` | 2 | L2 column-table polish. ~30-45 min UI work. cc-o1k already exposes the data; this is layout. |

### Tier 4 — README known-limitations (no code change)

| ID | P | Documented as |
|---|---|---|
| `cc-egk` | 2 | Worker single-writer guarantee — PM2 enforces in production. |
| `cc-uhc` | 2 | Cache extraction across worker restarts (cc-hy3 fixes the in-process case; cc-uhc covers cross-restart). |
| `cc-g87` | 2 | Stub-provider fallback has no in-UI cue; only triggers on misconfigured GEMINI_API_KEY. |

## Monday sequence

```
NOW       cc-2sa            pre-seed 3 fixtures            (Trench in progress)
NEXT      cc-cm5            override detection             (~45 min Trench)
          cc-1s8 + cc-hy3   worker correctness batch       (~45 min Trench)
          cc-wrn            CFR citation linking           (~30 min Trench)
          cc-fsa            verify during localhost smoke  (5 min Chair)
          cc-hfv            handoff.md cleanup             (5 min Tower)
          cc-htd            2-3 edge fixtures              (~1-2h Chair, image work)
          cc-64v            README + screenshots           (~1-2h Tower/Chair)
LATE      smoke localhost → redeploy → smoke live URL → submit
```

## Cuts available if Monday slips

In rough order of preference:

1. **Skip cc-htd edge fixtures.** The 6 real bottles + cc-2sa pre-seed + reviewer-driven mismatched-pair uploads already cover the failure-mode story. Edge fixtures sharpen the demo but aren't required.
2. **Skip cc-wrn.** CFR linking is polish; the citations are still in the message text, just not clickable.
3. **Skip cc-1s8 + cc-hy3.** Document in README as known limitations.
4. **Last-resort: skip cc-cm5.** Override signal becomes a README "future work" note.

If all four cuts apply, the demo is still credible: live URL, real bottles, pre-seeded queue, real Gemini extraction, regulation-grounded verdicts (post cc-0ue), transparent extracted values, decision UI with adjudication framing, reviewer-driven upload + mismatched-pair failure demo.

## Tier 5 — explicitly deferred (no fix, README doc only)

| ID | P | Reason |
|---|---|---|
| `cc-egk` | 2 | PM2 enforces single worker in production. |
| `cc-uhc` | 2 | Cost optimization; cc-hy3 covers in-process case. |
| `cc-g87` | 2 | Defensive against env regression; live has the key set. |

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed; cc-ckg deployed).
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 closed).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (cc-syy closed). Override-detection adds the diverged-from-recommendation signal (cc-cm5).
- **Per-finding scope:** Option A — label-level decisions only, no per-finding overrides. cc-q25 closed; future work noted in README.
- **Reviewer onboarding:** primary affordance is upload-driven workflow with downloadable fixtures + post-upload navigation; reset-to-empty as discreet secondary affordance (cc-1c5 / cc-idm closed). Pre-seed adds 3 already-processed jobs at deploy time (cc-2sa).
- **Verbatim Gemini prompt:** cc-7v3 chose verbatim-extraction. Verification logic absorbs common verbatim patterns (CONTENT X, PRODUCT OF X, line-break hyphens) per cc-0ue.
- **Tool positioning:** agent-assisted COLA pre-review, not COLA review. Tool = recommendation/screening; HITL = reviewer/adjudicator. ARCHITECTURE.md "Tool Positioning & Vocabulary" section is canonical.
- **Known-limitation pattern:** deferred bugs (cc-egk, cc-uhc, cc-g87, plus anything cut in Monday slip) are transparently documented in README rather than fixed. cc-64v carries this.

## Open issue inventory

| ID | P | Type | Status | Notes |
|---|---|---|---|---|
| cc-2sa | 1 | task | in_progress | TIER 1 NOW — pre-seed 3 fixtures. |
| cc-cm5 | 1 | task | open | TIER 1 NEXT — override detection. |
| cc-1s8 | 1 | task | open | TIER 2 — worker correctness batch with cc-hy3. |
| cc-hy3 | 1 | task | open | TIER 2 — worker correctness batch with cc-1s8. |
| cc-wrn | 1 | task | open | TIER 2 — CFR citation linking. |
| cc-fsa | 2 | task | open | TIER 2 — smoke-verify; close or document. |
| cc-hfv | 2 | task | open | TIER 2 — Tower cleanup of handoff.md. |
| cc-htd | 1 | task | open | TIER 2 — 2-3 edge fixtures. |
| cc-64v | 1 | task | open | TIER 1 FINAL — README polish + screenshots. |
| cc-9wh | 2 | task | open | TIER 3 — multi-select upload; ship with cc-lm6 or skip. |
| cc-lm6 | 1 | bug | open | TIER 3 — Gemini 429 retry; ship with cc-9wh or document. |
| cc-55c | 2 | task | open | TIER 3 — L2 column polish. |
| cc-egk | 2 | chore | open | TIER 4 — README known-limitation. |
| cc-uhc | 2 | chore | open | TIER 4 — README known-limitation. |
| cc-g87 | 2 | bug | open | TIER 4 — README known-limitation. |
