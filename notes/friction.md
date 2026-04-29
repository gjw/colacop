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
