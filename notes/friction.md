# Friction Log

This is the first concrete trial of the source → fact → requirement → use case
pipeline. Capturing friction as it surfaces. The point is not to get the pipeline
right on the first try; it is to identify the parts that need work.

Each entry: what happened, why it was friction, what we did about it, and (if
applicable) a proposal for a structural fix.

## 2026-04-29

### F1 — Load-bearing interpretations escaped fact-capture

**What happened.** The committed reading of the assignment — that the prototype
receives both a label image and corresponding application data — was made during
the initial discovery pass and propagated into REQ-001, REQ-004, and the entire
ARCHITECTURE.md design. But it was never written down as an inferred fact. When
Chair questioned the framing mid-session, there was no provenance trail to point
at; we had to reconstruct the reasoning from interview quotes.

**Why this is friction.** The whole purpose of the source → fact → requirement
pipeline is provenance: requirements should trace to facts; facts should trace to
sources. An *interpretation* of a source is itself a fact (a claim about what the
source means), and silently committing one upstream of architecture leaves a
load-bearing decision with no audit trail. F-044 was added retroactively this
session. It should have existed before ARCHITECTURE.md was written.

**Fix applied.** Added F-044 (committed comparison interpretation) and F-045
(two-layer verification model). REQ-001/REQ-004 supported_by patched. New
REQ-011 explicitly grounds Layer 1's unconditional behavior.

**Proposed structural fix.** Add a guideline to `prompts/tower.md` Cold-Start
Step 1b (Clarify) and to the Replan section: *if you commit to an interpretation
that the source material does not explicitly state, write it as an inferred fact
(claim_kind: inferred, fact_type: scope_decision) before proceeding to
architecture or requirements.* Also: any time a requirement's `rationale` would
read "we decided that..." or "this is implied by...", the implication itself is
fact-shaped and should be written down.

### F2 — Architecture decisions made before grounding facts existed

**What happened.** ARCHITECTURE.md committed to Knex, then to a single-call
provider model, then to a `verifyLabel(application data, extracted fields)`
signature — all reasonable choices, but each presupposes a worldview (we have
both inputs, we want exact-match warnings, etc.) that wasn't grounded in named
facts. When Chair questioned the input frame, ARCHITECTURE.md silently shifted
underneath us.

**Why this is friction.** Architecture is downstream of requirements, which are
downstream of facts. When architecture changes drive backfill into facts, the
arrow is reversed and the pipeline loses its meaning. The pipeline should resist
architecture-first thinking, not just enable it.

**Fix applied.** Updated ARCHITECTURE.md > Model Provider Boundary to record the
two-layer verification model explicitly, citing F-045 and REQ-011. Tightened the
provider interface (`analyzeLabel` on provider, `verifyLabel` is domain logic).

**Proposed structural fix.** Before any ARCHITECTURE.md edit that is not pure
implementation detail, check that the *premise* of the edit is grounded in a
fact or requirement. If it isn't, write the fact first. This is more discipline
than tooling — but it's a small enough discipline that a Tower workflow note
might suffice.

### F3 — The discovery process did not surface its own assumptions

**What happened.** The original `discovery/facts.yaml` and
`design/requirements.yaml` were thorough about *interview-derived* facts but
silent about *interpretive* and *design-decision* facts. There was no fact
type for "the assignment is silent on X but we are committing to interpretation
Y" until F-044 was added retroactively.

**Why this is friction.** A facts file that records only what stakeholders said,
and not what the team inferred, is fundamentally incomplete. Real systems have
both kinds of claims, and both kinds of claims need provenance. Without
inferred-fact capture, every architecture decision becomes either (a) an
unprovenanced implementation choice or (b) over-justified by direct quotes that
do not actually constrain the choice that tightly.

**Fix applied.** Added `fact_type: scope_decision` and `fact_type:
scope_inference` precedents in F-044, F-045, F-046. Future facts that record
team-side decisions can follow this pattern.

**Proposed structural fix.** Document the inferred-fact pattern in
`prompts/tower.md` and in this repo's discovery docs. Make `claim_kind: inferred`
+ `fact_type: scope_decision` a first-class shape in the schema, not an
ad-hoc convention.

## 2026-04-30

### F4 — Tower kept building specs against unverified ground state

**What happened.** After cc-scz scaffolding closed, Tower iterated through
cc-7qe (provider pick), cc-5ea (regulatory pass), cc-4fk (deployment target),
F-046 / REQ-012 (input pairing model), and the cc-xog design notes themselves
— all while cc-xog was in flight. By the time Chair sat down to audit the
running prototype, Tower had layered three more decisions on top of an
unverified implementation. Chair's instinct to "back out and define the use
case" was correct: continuing to plan against ground state we hadn't
inspected was accumulating risk.

**Why this is friction.** Tower's mandate is planning, but planning without
periodic ground-state verification means spec drifts away from reality.
Trench produces *something*, Tower keeps elaborating the spec, and by the
time Chair audits, the gap between spec and code may have several decisions
piled on top — making it expensive to roll back if any of them is misaligned.

The structural problem: there is no role explicitly responsible for "stop and
verify what Trench shipped before Tower writes more specs against it." Tower
plans forward; Trench builds; Chair coordinates. Nobody is the audit role
between Trench-shipped and Tower-elaborates-further.

**Fix applied.** None yet — surfaced by Chair, not by the system. The
sprint-order.md replan now treats audit as a gating step before any
further bead generation.

**Proposed structural fix.** This is what the Warden / Audit role is for in
the role lineup (see CLAUDE.md / prompts/tower.md). The take-home prototype
has not been running Warden because the project is small and the agent count
is intentionally minimal. But for a multi-day, multi-Trench project, an
explicit Warden:Audit pass after each Trench-shipped task — *before* Tower
writes the next batch of beads against it — would have caught this.

For this project specifically, the lightweight version is: Tower should not
write new beads against an in-progress task's outputs until Chair has
performed a smoke test of the previous task's deliverable. Add this to
prompts/tower.md as a session-start checklist item.

### F5 — Use case authoring deferred too long

**What happened.** UC-001 (the Cockburn-style use case) has been on the
queue as cc-fk3 since the original task graph was created, blocked on
cc-5ea. cc-5ea has been closed for over a session, and yet the use case
still has not been written, while ARCHITECTURE.md and the data model have
continued to evolve. cc-xog was implemented entirely without UC-001 ever
being written.

**Why this is friction.** Use cases sit between requirements and
architecture. Skipping them means architecture is being asked to satisfy
requirements without an intermediate description of *how an actor uses the
system to accomplish a goal*. The actor's perspective is what reveals
whether the architecture's affordances are good — which is exactly the
question Chair is now asking after seeing the running app.

**Fix applied.** Replan promotes use case authoring to the next action,
ahead of any further code work.

**Proposed structural fix.** In `prompts/tower.md` cold-start mode, do not
allow Step 3 (Task Breakdown) to start before Step 2.5 (use cases) is
written. Use cases are not optional connective tissue; they are the
contract between requirements and architecture.

## 2026-05-02

### F6 — Parsing-bug bead written from invented input strings

**What happened.** cc-9cx was filed as a P0 demo-blocker after live testing
in cc-7w9 surfaced ABV format failures. The bead body listed four
hypothetical Gemini-output strings the regex "likely" rejected and
recommended broadening parseAbv against them. When Trench actually tested
those strings against the current regex, three of the four already parsed
correctly; the bead's hypothesis would have produced a regex change that
addressed almost none of the real failures. The actual breakage (period
after `alc`, `by\s+` separator) only became visible after re-running
Gemini against all 6 fixtures and capturing the raw output — which the
original cc-7w9 work had not preserved.

**Why this is friction.** Tower wrote a parsing-bug spec from imagined
inputs rather than captured ones. This is the same pattern as F1 (load-
bearing interpretations escaping fact-capture) but at the implementation
layer: a bead's "observed during live testing" is load-bearing if it
drives the fix, and inventing the symptoms — even plausibly — produces
specs that look grounded but aren't. Worse, the bead's specificity made
it sound rigorous: four labeled cases, one suggested approach. A Trench
agent following the bead literally would have shipped an incomplete fix
and a passing test suite that proved nothing about the real failures.

**Fix applied.** Trench captured real Gemini extractions to
`fixtures/raw/*.extraction.json` before changing the regex, then wrote
the test against the captured strings rather than the bead's invented
ones. The cc-9cx fix landed correctly. Filed cc-fsa as a separate
prompt-tuning follow-up (Gemini canonicalizes proof tails).

**Proposed structural fix.** Two places in `prompts/tower.md`:

1. **Bead-writing guideline for parsing/regex/extraction bugs:** if a
   bead claims a parser rejects specific inputs, those inputs must be
   *captured* (real tool output, paste-quoted) — not *hypothesized*.
   Hypothetical examples are fine in the suggested-approach section as
   illustrations, but the "what's broken" claim needs evidence.
2. **Live-testing artifacts must be preserved.** When a bead like cc-7w9
   wires a real provider end-to-end and surfaces regressions, the raw
   tool output should be saved to a versioned location (e.g.
   `fixtures/raw/*.extraction.json`) before the next bead is filed. The
   captures cost API spend and are the empirical record that subsequent
   parsing/format beads should test against. cc-9cx surfaced this
   absence — the live test ran but nothing was kept.
