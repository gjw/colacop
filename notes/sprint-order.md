# Sprint Order

Updated Saturday 2026-05-02 ~17:00 by Tower (post-cc-vho merge, after cc-o1k / cc-7v3 / cc-q25 review). Hard deadline Mon 2026-05-04 EOD; target ship Sunday morning.

## Where we are

- **Today:** Saturday 2026-05-02, late afternoon.
- **Closed since last replan:** cc-9cx (ABV regex broadened), cc-vho (label image render — merged today), cc-q25 (per-finding scope — resolved as Option A).
- **Three new beads filed by Chair after live-testing:**
  - cc-o1k — surface Gemini's extracted_value on every finding. **Promoted to P0.** Critical because (a) the agent seeing 'fail' with no extracted value can't tell whether the label is bad or the system is broken, and (b) cc-7v3 is unfixable without it.
  - cc-7v3 — fireball false-fails Layer 1 alcoholContent. P1 bug. Tower's bet: vertical-text on the back panel, fixable by re-stitching with rotation.
  - cc-q25 — per-finding vs label-level decisions. Closed as Option A (label-level only) per Tower decision; future work documented for the README.
- **cc-55c demoted to P2** — cc-o1k subsumes most of its scope.
- **cc-1c5 expanded** — now the unified reviewer-experience bead (pre-load + downloadable fixtures + JSON schema example + post-upload navigation + format help + processing indicator).
- **cc-idm filed (P2)** — reset-to-demo button as secondary affordance; build only with Sunday afternoon slack.

## Tier ranking (final pre-deploy)

### Tier 1 — must ship for a credible demo

| ID | Why |
|---|---|
| `cc-o1k` | Without extracted values visible, every fail is opaque; demo credibility tanks. Also unblocks cc-7v3 diagnosis. |
| `cc-7v3` | A demo bottle reporting fail-on-a-rule-the-label-actually-satisfies is the worst possible demo failure mode. Easy to fix once cc-o1k makes the value visible. |
| `cc-ckg` | No live URL, no submission. Highest-uncertainty task; surface blockers early. Mostly Chair-driven on the box, parallelizable with Trench app fixes. |
| `cc-1c5` | Reviewer arriving at the URL must see something interesting AND be able to exercise the workflow themselves end-to-end. Pre-load + downloadable fixtures + post-upload nav. |

### Tier 2 — strongly want for a complete demo

| ID | Why |
|---|---|
| `cc-syy` | UC-001 step 6 (approve / reject / send-back). Biggest UC-001 hole. Skippable in extremis if Saturday night runs long; the rule engine + transparency layer is the interesting bit either way. |
| `cc-ye9` | Decouple low-confidence from Layer 1 verdict. Surgical, ~30 min. UC-001.3c semantics. |
| `cc-srj` | Per-field needs_application_data on partial JSON. Surgical, ~30 min. UC-001.4e semantics. |

### Tier 3 — polish

| ID | Why |
|---|---|
| `cc-htd` | Edge-case fixtures (brand drift, ABV mismatch, missing back panel, low-confidence, warning violation). The 6 real bottles cover the happy path; edge cases tell the rest of the story. |
| `cc-55c` | Layer 2 column-table polish on top of cc-o1k. |
| `cc-idm` | Reset-to-demo button as secondary affordance. |
| `cc-64v` | README final polish, including known-limitations section. |

### Tier 4 — explicitly deferred

| ID | Why |
|---|---|
| `cc-egk` | Worker single-writer guarantee. Dev-environment issue; production has one PM2-managed worker. Document in README. |
| `cc-uhc` | Cache extraction so JSON-after-image doesn't re-extract. Cost optimization, not correctness. Document. |
| `cc-hfv` | docs/handoff.md drift. Defer indefinitely. |

## Tonight's sequence (Saturday evening)

```
1. cc-o1k → spawn fresh Trench. Migration adds extracted_value to
   layer1_results and extracted_value+application_value to
   layer2_results. persistLayer1 / persistLayer2 populate them.
   API response and UI rendering follow. ~2-3h Trench work.

2. cc-7v3 → after cc-o1k lands, look at fireball's actual
   alcoholContent extracted string in the UI. Top hypothesis:
   vertical-text on the back panel. If confirmed: re-stitch
   fireball with the back panel rotated; re-run; should pass.
   ~30-60 min once cc-o1k lands.

3. cc-ckg deploy → runs in parallel with the above. Chair drives
   the box; Trench drives the app. nginx vhost, PM2 ecosystem,
   Postgres docker-compose, .env.production with GEMINI_API_KEY,
   manual ssh + git pull + build + reload. Get
   https://colacop.foramerica.dev returning 200 first; iterate
   until the live URL is up.

4. cc-1c5 expanded → after cc-ckg lands. Pre-load fixtures, expose
   download links, JSON schema example, post-upload navigation,
   format help on upload form, processing spinner in detail view.
   The seed script runs at deploy time so the queue is non-empty
   on first reviewer load.

5. Smoke test live URL with all 6 bottles end-to-end. Verify the
   reviewer-driven upload flow: download a fixture, edit JSON,
   re-upload, observe latency.
```

## Sunday plan

```
morning:    cc-syy decision UI (UC-001 step 6). Spawn fresh Trench.
            Approve / reject / send-back, decisions table, queue
            removal on decision.

            cc-ye9 + cc-srj small-fix batch.

midday:     Redeploy to live URL. Smoke test the full UC-001 flow
            with decisions.

afternoon:  cc-htd edge fixtures (brand drift, ABV mismatch, missing
            back panel, low-confidence, warning violation). Some can
            be variants of existing bottles with edited JSON; some
            need new images (intentionally bad photos for low-conf,
            front-only crop for missing-warning).

            (Optional) cc-idm reset-to-demo button.
            (Optional) cc-55c column-table polish on Layer 2.

evening:    cc-64v README final polish:
              - Live URL prominent
              - Local-run instructions verified
              - Deploy story
              - Source → fact → requirement → use-case pipeline
                narrative
              - Known limitations: cc-egk (worker single-writer),
                cc-uhc (extraction cache), cc-hfv (handoff drift),
                cc-q25 deferred per-finding decisions, cc-55c /
                cc-idm if not built.
              - Pointer to UC-001 in design/use-cases.yaml.

late:       Final smoke test on https://colacop.foramerica.dev.
            Stage submission email; sleep on it.
```

## Monday

```
early:      One last smoke test; submit before noon at the latest.
```

## Cuts available if Saturday night slips

In rough order of preference:

1. Skip cc-htd edge fixtures (Sunday afternoon). The 6 real bottles cover the happy path and a couple of edge cases (fireball's vertical text, agave's missing-fields-on-photo). Reviewer sees the system handle real labels; that's the demo.
2. Skip cc-idm and cc-55c (already P2/optional).
3. Skip cc-syy (Sunday morning). The reviewer can grok the system's value from cc-o1k's transparency layer alone — they see *what was extracted*, *what the rule said*, and *what the comparison found*. Decisions are the agent's next action; without them, the demo simply ends after step 5 of UC-001 and the README documents this.

If all of (1) (2) (3) skip, the demo is still credible: live URL, real bottles, real Gemini extraction, regulation-grounded verdicts, transparent extracted values, reviewer can upload their own. That's enough.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed).
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 will make this true in code Sunday).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (no edit/undo). cc-syy implements.
- **Per-finding scope:** Option A — label-level decisions only, no per-finding overrides. cc-q25 closed; future work noted in README.
- **Reviewer onboarding:** primary affordance is upload-driven workflow with downloadable fixtures and post-upload navigation; reset-to-demo is a discreet secondary affordance, not a primary button. cc-1c5 + cc-idm.
- **Known-limitation pattern:** cc-egk and cc-uhc are deferred and will be transparently documented in README rather than fixed. cc-64v carries this.

## Open issue inventory

| ID | P | Type | Status | Notes |
|---|---|---|---|---|
| cc-o1k | 0 | task | open | TONIGHT — extracted values visible. Spawn fresh Trench. |
| cc-7v3 | 1 | bug | open | After cc-o1k. Fireball false-fail; vertical-text hypothesis. |
| cc-ckg | 0 | task | open | TONIGHT — deploy. Parallel with cc-o1k. |
| cc-1c5 | 0 | task | open | TONIGHT — after cc-ckg. Reviewer experience. |
| cc-syy | 0 | task | open | SUNDAY — decision UI. |
| cc-ye9 | 0 | task | open | SUNDAY — surgical. |
| cc-srj | 0 | task | open | SUNDAY — surgical. |
| cc-htd | 1 | task | open | SUNDAY afternoon — edge fixtures. |
| cc-64v | 1 | task | open | SUNDAY evening — README. |
| cc-55c | 2 | task | open | Optional polish on top of cc-o1k. |
| cc-idm | 2 | task | open | Optional reset-to-demo button. |
| cc-egk | 2 | chore | open | DEFERRED — README known-limitations. |
| cc-uhc | 2 | chore | open | DEFERRED — README known-limitations. |
| cc-hfv | 2 | task | open | DEFERRED — handoff drift. |
| cc-xog | 0 | task | in_progress | Chair to flip closed after the next live smoke confirms acceptance criteria 1-8 hold post-cc-9cx and post-cc-vho. |
