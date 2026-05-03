# Sprint Order

Updated Sunday 2026-05-03 afternoon by Tower (post cc-o1k / cc-7v3 / cc-ckg / cc-1c5
merge). Hard deadline Mon 2026-05-04 EOD; target ship Sunday evening or early Monday.

## Where we are

- **Today:** Sunday 2026-05-03, late afternoon. ~24-30h to deadline.
- **Closed since last replan (Saturday evening):**
  - cc-o1k — extracted values surfaced on every L1/L2 finding.
  - cc-7v3 — fireball alcoholContent fixed by tightening Gemini prompt to verbatim extraction.
  - cc-ckg — Linode deploy live at https://colacop.foramerica.dev.
  - cc-1c5 — reviewer experience: fixtures panel, downloadable fixtures, reset button,
    format help, processing spinner, worker-restart idempotence.
  - cc-idm — closed as subsumed by cc-1c5 (reset button shipped there).
- **Two follow-up bugs filed during cc-1c5 smoke test:**
  - cc-1s8 (P2) — upsertJob check-then-INSERT race; non-fatal log noise.
  - cc-hy3 (P2) — worker double-calls Gemini when image-then-JSON path is taken; cost waste.
- **Critical finding from this replan — not addressed in previous sprint plan:**
  cc-7v3's verbatim-prompt change introduced verdict regressions on 4 of the 6 demo
  bottles. Documented inside cc-0ue but not surfaced. **cc-0ue promoted P1 → P0.**
- **cc-lm6 promoted P1 → P0** — Gemini 429 retry. The cc-1c5 reset button re-queues
  all 6 fixtures simultaneously; without retry, some bottles will fail visibly on
  reset, defeating the reset feature.
- **cc-g87 demoted P1 → P2** — stub-provider UI cue. Production live URL has the
  Gemini key set; this only triggers on misconfiguration. Defer to README known-limitations.

## Tier ranking (final pre-submission)

### Tier 1 — must ship for a credible demo

| ID | P | Why |
|---|---|---|
| `cc-0ue` | 0 | **REGRESSION**. Live URL currently shows 4 bottles with bogus verdicts after the cc-7v3 verbatim-prompt change. cointreau warning false-fail; rumple/shinok countryOfOrigin false needs_review; rumple netContents false needs_review; possible agave classType regression; plus fireball.json has wrong netContents (`50 mL` vs the actual `375 mL` bottle). This is the worst-possible demo failure mode — the system flags valid labels as suspect. |
| `cc-lm6` | 0 | Gemini 429 retry. The cc-1c5 reset button re-queues 6 fixtures; without backoff, the reset path produces visible failures, breaking the feature we just shipped. |
| `cc-ye9` | 0 | Decouple low-confidence from L1 verdict. Surgical, ~30 min. UC-001.3c semantics. |
| `cc-srj` | 0 | Per-field needs_application_data on partial JSON. Surgical, ~30 min. UC-001.4e semantics. |

### Tier 2 — strongly want for a complete demo

| ID | P | Why |
|---|---|---|
| `cc-syy` | 0 | Decision step UC-001 step 6 (approve / reject / send_back). Biggest UC-001 hole. ~2-3h Trench work. Skippable in extremis if Sunday evening runs long; the rule engine + transparency layer is the interesting bit either way. |

### Tier 3 — must ship for submission

| ID | P | Why |
|---|---|---|
| `cc-64v` | 1 | README final polish: live URL prominent, local-run, deploy story, source→fact→requirement→use-case pipeline, known limitations. Sunday evening — cannot submit without this. |

### Tier 4 — polish (only if Sunday evening has slack)

| ID | P | Why |
|---|---|---|
| `cc-htd` | 1 | Edge-case fixtures. Skippable per previous plan; the 6 real bottles cover the happy path and (post-cc-0ue) the realistic verdict paths. |
| `cc-55c` | 2 | L2 column-table polish. Visual nicety; cc-o1k already exposes the data. |
| `cc-g87` | 2 | Stub-provider UI cue. Defer to README known-limitations. |
| `cc-fsa` | 2 | Gemini ABV proof-tail stripping. Likely subsumed by cc-7v3 verbatim prompt; verify and close on Monday smoke test if so. |

### Tier 5 — explicitly deferred to README known-limitations

| ID | P | Why |
|---|---|---|
| `cc-egk` | 2 | Worker single-writer guarantee. Production has one PM2-managed worker; dev-environment issue. Document. |
| `cc-uhc` | 2 | Cache extraction so JSON-after-image doesn't re-extract. Cost optimization. Document. |
| `cc-1s8` | 2 | upsertJob check-then-INSERT race. Non-fatal log noise; system recovers. Document. |
| `cc-hy3` | 2 | Worker double-Gemini-call on image-then-JSON. Cost waste; correctness fine. Document. |
| `cc-hfv` | 2 | docs/handoff.md drift. Defer indefinitely. |

## Sunday afternoon → evening sequence

```
1. cc-0ue → spawn fresh Trench. Single coherent task: make verbatim Gemini
   extractions produce correct verdicts.
   
   PROBLEM A: walk all 6 fixtures (agave, cointreau, fireball, rumble, rumple,
   shinok), compare each printed value to fixtures/applications/<stem>.json,
   correct any field that does not match the imaged bottle. Known: fireball
   netContents 50 mL → 375 mL.
   
   PROBLEM B: tighten verification.ts:
   - checkWarning: strip line-break hyphens ('PREG- NANCY' → 'PREGNANCY')
     before comparison; promotes cointreau back to needs_review/pass.
   - compareString: when extracted contains the canonical app value with a
     known wrapper prefix ('CONTENT X', 'PRODUCT OF X', 'PRODUCT OF THE X'),
     treat as pass. Affects rumple netContents, rumple/shinok countryOfOrigin.
   - Investigate agave classType regression: open the photo, decide whether
     classType is genuinely visible. If not, the extraction is now correctly
     conservative and the application JSON should be adjusted (or accept the
     fail as a real demo signal).
   
   ~1.5-2h Trench. ~5-7 file changes.

2. cc-lm6 → fresh Trench (or in-flight with cc-0ue if isolated). Gemini 429
   retry with exponential backoff in src/core/providers/gemini.ts. Honor
   retryDelay hint when present; cap at 3 retries.
   ~30-45 min. ~2-3 files.

3. cc-ye9 + cc-srj → batch into one Trench task (both touch verification.ts
   and schemas.ts). Decouple confidence from verdict + per-field
   needs_application_data on missing application keys.
   ~45-60 min combined. ~3 files.

4. Smoke test live URL: redeploy, reset, verify all 6 bottles produce
   sensible verdicts post cc-0ue + cc-ye9 + cc-srj. Check 429 retry by
   triggering reset twice in quick succession.

5. cc-syy → fresh Trench. Decisions table migration; POST /api/jobs/:id/decision;
   JobDetailView decision controls; default-exclude decided jobs from active
   queue; 'Decided' filter.
   ~2-3h. ~5-7 files.

6. Smoke test live URL: full UC-001 flow including decisions.

7. cc-64v → README polish. Either Tower or Chair. Live URL prominent;
   local-run instructions verified; deploy story; UC-001 pointer; known
   limitations section enumerating cc-egk / cc-uhc / cc-1s8 / cc-hy3 /
   cc-g87 / cc-fsa / cc-q25 / cc-hfv.
```

## Monday

```
early:   Final smoke test on live URL. Submit by noon at the latest.
```

## Cuts available if Sunday evening slips

In rough order of preference:

1. **Skip cc-syy.** Sprint plan supports this. The reviewer can grok the
   system's value from the transparency layer alone — they see what was
   extracted, what the rule said, what the comparison found. Decisions
   are the agent's next action; without them the demo simply ends after
   step 5 of UC-001 and the README documents this as the known cut.
2. **Skip cc-htd, cc-55c, cc-g87, cc-fsa** — already in Tier 4 / Tier 5.
3. **Last-resort: skip the post-cc-0ue redeploy if regressions are not
   visible enough.** cc-ye9 / cc-srj are surgical and low-risk; could ship
   together with cc-syy in one Sunday-late deploy.

If all of (1) (2) skip, the demo is still credible: live URL, real bottles,
real Gemini extraction, regulation-grounded verdicts that reflect the
actual labels (post-cc-0ue), transparent extracted values, reviewer can
upload their own. That's enough for the take-home.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed; cc-ckg deployed).
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 will make this true in code Sunday).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (no edit/undo). cc-syy implements.
- **Per-finding scope:** Option A — label-level decisions only, no per-finding overrides. cc-q25 closed; future work noted in README.
- **Reviewer onboarding:** primary affordance is upload-driven workflow with downloadable fixtures and post-upload navigation; reset-to-empty is shipped as a discreet secondary affordance. cc-1c5 / cc-idm closed.
- **Verbatim Gemini prompt:** cc-7v3 chose verbatim-extraction prompt over normalized-extraction. Verification logic must catch up to absorb common verbatim patterns (CONTENT X, PRODUCT OF X, line-break hyphens). cc-0ue carries this.
- **Known-limitation pattern:** deferred bugs (cc-egk, cc-uhc, cc-1s8, cc-hy3, cc-g87, cc-fsa, cc-hfv) are transparently documented in README rather than fixed. cc-64v carries this.

## Open issue inventory

| ID | P | Type | Status | Notes |
|---|---|---|---|---|
| cc-0ue | 0 | task | open | TIER 1 NOW — fixture audit + verbatim verdict-tolerance fixes. |
| cc-lm6 | 0 | bug | open | TIER 1 NOW — Gemini 429 retry with backoff. |
| cc-ye9 | 0 | task | open | TIER 1 NEXT — decouple confidence from L1 verdict. Surgical. |
| cc-srj | 0 | task | open | TIER 1 NEXT — per-field needs_application_data. Surgical. |
| cc-syy | 0 | task | open | TIER 2 — decision UI; ship if Sunday evening permits. |
| cc-64v | 1 | task | open | TIER 3 — README. Sunday evening, mandatory before submit. |
| cc-htd | 1 | task | open | TIER 4 — edge fixtures. Skippable. |
| cc-55c | 2 | task | open | TIER 4 — L2 column polish. |
| cc-g87 | 2 | bug | open | TIER 4 — stub-provider UI cue; document instead. |
| cc-fsa | 2 | task | open | TIER 4 — likely already fixed by cc-7v3 verbatim prompt; verify Monday. |
| cc-1s8 | 2 | task | open | TIER 5 — README known-limitations. |
| cc-hy3 | 2 | task | open | TIER 5 — README known-limitations. |
| cc-egk | 2 | chore | open | TIER 5 — README known-limitations. |
| cc-uhc | 2 | chore | open | TIER 5 — README known-limitations. |
| cc-hfv | 2 | task | open | TIER 5 — defer indefinitely. |
