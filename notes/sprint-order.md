# Sprint Order

Updated late Friday 2026-05-01 by Tower (after cc-7w9 Gemini wiring landed and live-test bugs were filed). Hard external deadline Mon 2026-05-04 EOD.

## Where we are

- **Today:** Friday 2026-05-01, late evening. Chair going to bed.
- **xog + Gemini both shipped.** The full extract → verify → render path now runs against real labels. cc-7w9 closed.
- **Three live-test beads filed by Chair:** cc-9cx (ABV regex, **promoted to P0**), cc-egk (worker race, P2), cc-uhc (double-extract, P2).
- **Effective deadline:** Mon 2026-05-04 EOD. Target ship Sun morning to leave Mon for any last fixes.

## Tier-ranked work for Saturday + Sunday

The bead board sorts by P0/P1/P2 but those tiers don't reflect what actually has to ship by Monday. Reranked by submission-quality impact:

### Tier 1 — must ship to have a credible demo

| ID | What | Notes |
|---|---|---|
| `cc-9cx` | Broaden Layer 1 ABV regex | Without this, every real extraction lies about ABV format. 30-min fix. **First thing Saturday.** |
| `cc-vho` | Render label image in detail view | Several UC-001 steps assume the agent can see the label adjacent to findings. Without it, the UI looks half-finished. |
| `cc-ckg` | Linode deploy: nginx + PM2 + env config + dry-run | Highest uncertainty task; surface blockers early. Mostly Chair-driven on the box. Can run in parallel with Trench fixes. |
| `cc-1c5` | Empty-queue solution on live URL | Without this, reviewer's first impression is a blank page. Depends on cc-ckg landing. |

### Tier 2 — strongly want for a complete-feeling demo

| ID | What | Notes |
|---|---|---|
| `cc-syy` | Decision UI (UC-001 step 6) | Biggest UC-001 hole. Approve / reject / send-back + decisions table + queue removal. 2-3 hours of Trench work. |
| `cc-ye9` | Decouple low-confidence from Layer 1 verdict | Surgical fix, ~30 min. UC-001.3c semantics. |
| `cc-srj` | Per-field needs_application_data on partial JSON | Surgical fix, ~30 min. UC-001.4e semantics. |

### Tier 3 — polish

| ID | What | Notes |
|---|---|---|
| `cc-55c` | Layer 2 side-by-side detail | Improves the "does this match?" reading at a glance. Depends on cc-vho. |
| `cc-htd` | Edge-case fixtures (brand drift, ABV mismatch, missing back, low-conf, warning violation) | The 3 real-bottle composites cover the happy path; the edge cases need to exist for the demo to tell its story. |
| `cc-64v` | README polish (live URL, deploy story, known-limitations) | Final task. Document cc-egk and cc-uhc as known-limitations transparently. |

### Tier 4 — explicitly deferred (document, don't fix)

| ID | What | Notes |
|---|---|---|
| `cc-egk` | Worker single-writer guarantee | Dev-environment issue; production has one PM2-managed worker. Document. |
| `cc-uhc` | Cache extraction so JSON-after-image doesn't re-extract | Cost optimization; not a correctness issue. Architecture note worth a line in README. |
| `cc-hfv` | Reconcile docs/handoff.md drift | P2 cleanup; defer indefinitely if no slack. |

## Recommended Saturday sequence

```
8:00   wake; coffee; check bead state
8:15   cc-9cx — broaden ABV regex; add tests; commit
9:00   cc-vho — Trench: static-serve route + image render in detail view
       (Chair: in parallel, start sshing to linode43393, prep nginx vhost
        + PM2 ecosystem.config + .env on the box)
11:00  cc-ckg — deploy dry-run; iterate until colacop.foramerica.dev returns 200
12:30  lunch
13:30  cc-1c5 — empty-queue solution (recommend Option C: pre-load fixtures
       so queue is non-empty on first load; document in
       notes/empty-queue-decision.md)
14:30  cc-syy — Trench: decision UI + decisions table + queue removal
17:30  cc-ye9 + cc-srj — small surgical fixes; batch commit
19:00  redeploy; smoke test live URL with full UC-001 flow
20:00  pause; Sunday is for polish + edge fixtures + final smoke
```

## Sunday plan

```
morning   cc-htd edge fixtures (brand drift, ABV mismatch, missing back,
          low-conf, warning violation)
midday    cc-55c side-by-side Layer 2 detail
afternoon cc-64v README final polish (live URL, deploy story, known
          limitations including cc-egk and cc-uhc, the
          assumptions/limitations list, the source → fact → requirement
          pipeline narrative)
evening   final smoke test on https://colacop.foramerica.dev
          end-to-end with at least one of each fixture category
late      stage submission email; review one more time
```

## Monday plan

```
early   one final smoke test; submit before noon at the latest
```

## Why this order (and why deploy mid-day Saturday)

Deploy is the highest-uncertainty task in the queue. Discovering Saturday morning that nginx vhost has a config bug, or that PM2 needs a different working-dir, or that npm ci on the box hits a Node version mismatch, is far better than discovering it Sunday afternoon. Deploying with a partial UC-001 flow is fine — once the live URL is up, every subsequent fix benefits from being live-testable, and the deploy story stops being theoretical.

Decision UI (cc-syy) is the biggest remaining piece of work and it's load-bearing for UC-001 step 6, but the reviewer can grok the system's value without it (the rule engine is the interesting bit). Saving cc-syy until after deploy means an in-flight live URL while Trench builds the UI; if cc-syy slips, the demo still works at the level of "show me the Layer 1/Layer 2 findings."

cc-9cx ahead of everything because a single regex line determines whether real labels look honest or look broken. Cheapest possible move; biggest credibility lift.

## Decisions locked across all sessions

- **SQL access library:** Kysely (cc-ff6 closed).
- **Model provider:** Google Gemini 3.x Pro via direct Gemini API (cc-7w9 closed; provider seam preserved). Anthropic and xAI excluded; OpenAI is the fallback.
- **Verification model:** two layers per F-045 / REQ-011. Layer 1 unconditional; Layer 2 conditional on application data; hybrid deterministic-and-LLM where appropriate.
- **Input frame:** label image + application data, paired by filename stem, one-to-one (F-044, F-046, REQ-012).
- **Deployment target:** Linode 16 GB linode43393 in US Dallas TX, https://colacop.foramerica.dev (cc-4fk closed).
- **TTB regulatory grounding:** F-047 / F-048 / F-051-054 / F-052 / F-056 / F-057.
- **Verdict semantics:** Layer 1 verdict reflects the rule outcome only; extraction_confidence is a parallel signal (cc-ye9 will make this true in code).
- **Decision step:** approve / reject / send_back + optional note; one decision per job; final for the prototype (no edit/undo). cc-syy implements.
- **Known-limitation pattern:** cc-egk and cc-uhc are deferred and will be transparently documented in README rather than fixed. cc-64v carries this responsibility.

## Open issues

| ID | P | Type | Status |
|---|---|---|---|
| cc-9cx | 0 | bug | open |
| cc-vho | 0 | task | open |
| cc-ckg | 0 | task | open (deps cc-7w9 closed → ready) |
| cc-1c5 | 0 | task | open (deps cc-7w9 closed, cc-ckg open) |
| cc-syy | 0 | task | open (deps cc-xog closed → ready) |
| cc-ye9 | 0 | task | open (ready) |
| cc-srj | 0 | task | open (ready) |
| cc-55c | 1 | task | open (deps cc-7w9 closed, cc-vho open) |
| cc-htd | 1 | task | open (ready) |
| cc-64v | 1 | task | open (deps cc-4fk closed, cc-xog closed → ready) |
| cc-egk | 2 | chore | open (deferred → README only) |
| cc-uhc | 2 | chore | open (deferred → README only) |
| cc-hfv | 2 | task | open (deferred indefinitely) |
| cc-xog | 0 | task | in_progress (Chair to flip closed after typecheck/test pass) |
