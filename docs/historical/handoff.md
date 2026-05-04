# Handoff Notes (historical — superseded by ARCHITECTURE.md)

> **Note:** These are early discovery-phase planning notes from before the
> architecture was locked. They have drifted from the implemented system and
> are kept for provenance only. For current architecture, vocabulary, and
> design decisions see `ARCHITECTURE.md`. For sprint state see
> `notes/sprint-order.md`. Bead tracker (`br list`) is authoritative for
> open work.

---

This document is for the next coding agent or collaborator who resumes work in this repo. It explains the lightweight discovery workflow we have been using, what has already been decided, what has deliberately not been decided, and how to continue without losing the thread.

## Current Goal

The assignment is to build an AI-powered alcohol label verification prototype. Before implementing the app, we are doing a small, pragmatic requirements pass that preserves provenance from the source material.

The process is intentionally light. This is not meant to become a full requirements-management framework inside the take-home project. The user has a separate, larger idea about facts, provenance, requirements, use cases, and graph/RDF-backed traceability, but for this repo we are only proving out enough of that approach to guide a better prototype.

## Repo State

Important files:

- `assignment.md`: Markdown conversion of the original take-home assignment.
- `discovery/sources/`: individual source documents extracted from the assignment and later external research.
- `discovery/facts.yaml`: extracted facts with provenance, authority context, and tags.
- `design/requirements.yaml`: proposed requirements grouped from facts.
- `README.md`: short reviewer-facing overview.
- `docs/handoff.md`: this file.

The original `.docx` may also exist in the repo root. It was converted to `assignment.md` with minimal changes.

Tooling note: use `nodenv` to lock the Node runtime for this repo. Workflow will be managed with `br` (`beads_rust`) and inspected with `bv`; `br sync --flush-only` does not commit anything, so `.beads/` changes need explicit git commits when used.

## Workflow Philosophy

We are keeping a clear chain:

```text
raw source material -> extracted facts -> requirements -> use cases -> features/architecture
```

The central rule is that requirements are not supposed to appear out of nowhere. A requirement should be traceable back to one or more facts, and facts should be traceable back to source material. This keeps the prototype focused on building the right thing for the right reasons, not just building a plausible list of features.

Facts are claims. Requirements are commitments. Use cases describe how an actor accomplishes a goal. Features and architecture are implementation choices that satisfy requirements and support use cases.

## Source Material

The original assignment contained four interview sections. Those were split into separate files under `discovery/sources/`:

- `S-001-sarah-chen-deputy-director-label-compliance.md`
- `S-002-marcus-williams-it-systems-administrator.md`
- `S-003-dave-morrison-senior-compliance-agent.md`
- `S-004-jenny-park-junior-compliance-agent.md`

An additional external source note was added:

- `S-005-anthropic-provider-supply-chain-risk.md`

That source captures current external context about Anthropic as a model-provider and procurement/supply-chain risk. It should be treated as architecture/procurement context, not as a claim about model quality.

## Facts

Facts live in `discovery/facts.yaml`.

The fact IDs are manually assigned in the form `F-001`, `F-002`, etc. We discussed UUID-ish IDs such as Nano ID, ULID, and short UUIDs, but decided manual IDs are clearer for this small assignment.

Each fact currently has fields like:

- `id`
- `statement`
- `claim_kind`
- `fact_type`
- `source`
- `authority`
- `tags`
- sometimes `related_people` or `related_facts`

Facts are allowed to include stakeholder statements, external reports, inferred technical risks, and contextual facts. Not all facts should become requirements. Some are context-only or future-production considerations.

The file currently contains 43 facts:

- `F-001` through `F-041`: extracted from the assignment interviews.
- `F-042`: Anthropic-specific supply chain/procurement risk.
- `F-043`: broader inferred risk from depending on a single model provider.

When adding facts, keep statements short and precise. Do not turn them directly into design commitments unless the source really made a requirement-like claim. If a fact is an inference, mark `claim_kind: inferred`.

## Requirements

Requirements live in `design/requirements.yaml`.

The current requirements are proposed, not final:

- `REQ-001`: Support fast, simple single-label review.
- `REQ-002`: Keep the agent experience low-friction.
- `REQ-003`: Avoid blocking review on long-running analysis.
- `REQ-004`: Verify core label fields against application data.
- `REQ-005`: Apply field-specific matching rules.
- `REQ-006`: Separate matches, mismatches, and cases needing review.
- `REQ-007`: Operate as a standalone proof of concept.
- `REQ-008`: Support batch-oriented ingestion.
- `REQ-009`: Handle imperfect label images gracefully.
- `REQ-010`: Persist processing and review state.

The requirements reference supporting fact IDs through `supported_by`. This link is important. If a requirement changes, update the fact references. If a requirement is only an implementation idea, it probably belongs under `candidate_features`, not as a requirement statement.

## Positive Decisions

We decided to use Markdown for raw source material. Interview source files should preserve original wording as much as possible.

We decided to use YAML for the structured discovery/design artifacts in this repo. The user likes EDN and may use it in a future framework, but YAML is more editor-readable and broadly accessible for this assignment.

We decided not to use JSON or JSONL for hand-authored design artifacts because they are noisy, overly quoted, lack comments, and are unpleasant for prose-heavy records.

We decided to keep `assignment.md` in the repo root.

We decided to use `discovery/` for source material and facts, and `design/` for requirements and future use cases.

We decided that facts and requirements are separate. Facts can be contextual, contested, inferred, or source-specific. Requirements are design commitments derived from fact clusters.

We decided that regulation should eventually be modeled as the same broad class of source-backed fact, but with a different authority type. In the user's larger framework, regulation may be a stakeholder-like source. For this repo, do not overbuild that ontology.

We decided that `F-017`, `F-018`, `F-019`, and `F-020` are mostly deferred context for the current prototype. Azure, FedRAMP, COLA's .NET stack, and the failed COLA rebuild matter for future production/integration, but direct COLA integration is out of scope because of `F-021`.

We decided that the 5-second performance concern should be understood as agent-perceived latency, not end-to-end time from label submission to completed analysis. In a real workflow, processing can happen asynchronously before the human opens the item.

We decided the architecture should naturally lean toward asynchronous ingestion and review:

```text
file arrives -> processing queue -> analysis runs -> result persists -> agent reviews processed work
```

The likely feature shape is a watched incoming directory plus a background worker and durable status/result storage. This is still a feature/architecture choice, not a requirement by itself.

We decided that SQLite is probably sufficient for the prototype, but Postgres in Docker remains defensible if it is faster or more comfortable for the implementer. Requirements should stay database-neutral for now.

We decided that the system should not be beholden to one model provider. `F-042` and `F-043`, together with network/cloud dependency facts `F-025` and `F-026`, should eventually support a model-provider abstraction or at least a clean boundary around the model/OCR provider.

## Negative Decisions

Do not turn this repo into the user's full future provenance framework. Keep the process lightweight enough to finish the actual take-home assignment.

Do not introduce RDF, PROV-O, Datomic, XTDB, Fluree, or graph database machinery into this repo unless the user explicitly redirects. We discussed PROV-O and the user liked it for later, but it is out of scope here.

Do not make the watcher, queue, SQLite, Postgres, or any specific implementation detail a hard requirement unless the user explicitly chooses it. Requirements should describe durable needs; features and architecture can describe candidate solutions.

Do not treat every fact as equally requirement-worthy. Some facts are background context, future-production context, risk context, or validation prompts.

Do not interpret the 5-second latency fact as "the whole system must complete all processing within 5 seconds of initial submission." It means agents should not be blocked by slow analysis when doing review.

Do not build direct COLA integration. It is explicitly out of scope for the prototype.

Do not persist sensitive submitted data unnecessarily. The prototype should demonstrate feasibility without creating production-grade retention or PII obligations.

Do not assume government-warning rules are fully validated yet. Jenny's claims are useful, but the exact regulatory facts still need a targeted TTB review.

## Next Recommended Step

Before writing use cases, do a small TTB/regulatory pass. Keep it targeted. The goal is not to fully model alcohol-labeling law; the goal is to validate facts that affect correctness:

- mandatory label fields
- government warning exact text
- government warning formatting/capitalization requirements
- alcohol content display requirements
- brand/class/type/net contents basics

Add one or two new source files under `discovery/sources/` for the TTB material, then extract only the regulatory facts needed for the prototype into `discovery/facts.yaml`. After that, update `design/requirements.yaml` so requirements about warning text and mandatory fields are supported by regulation-backed facts, not just interview claims.

## After TTB Facts

The next design artifact should probably be a use-case file under `design/`.

The user mentioned Alexander Cockburn-style use cases. Expect one main use case with extensions rather than many separate use cases. A likely main use case:

```text
UC-001: Verify an alcohol label application
```

Possible extensions:

- submitted file is already processed
- submitted file is still queued or processing
- batch of files arrives
- extracted field clearly matches application data
- extracted field clearly mismatches application data
- brand differs only by case/punctuation and needs tolerant matching
- government warning text/capitalization fails strict matching
- label image is unreadable or low confidence
- model provider is unavailable or blocked

Keep use cases actor- and goal-oriented. Do not let them become UI specs too early.

## Implementation Direction To Preserve

The emerging architecture is:

```text
incoming directory
  -> watcher notices new files
  -> worker creates/updates job status
  -> OCR/LLM extraction and verification run
  -> results are written to a database
  -> original file is moved to processed/ or failed/
  -> UI shows processed, pending, failed, and needs-review items
```

The UI should probably be queue-first rather than upload-first. An agent should see work that has already been processed, plus queue status for items still pending.

The model/OCR layer should be isolated behind an interface because model providers are both operational and procurement risks. This does not require multiple providers on day one, but the architecture should avoid hard-coding one provider throughout the app.

## Useful Validation Commands

YAML can be checked with Ruby:

```sh
ruby -e 'require "yaml"; YAML.load_file("discovery/facts.yaml"); YAML.load_file("design/requirements.yaml"); puts "YAML OK"'
```

Fact references in requirements can be checked with:

```sh
ruby -e 'require "yaml"; facts=YAML.load_file("discovery/facts.yaml").fetch("facts").map { |f| f.fetch("id") }; reqs=YAML.load_file("design/requirements.yaml").fetch("requirements"); refs=reqs.flat_map { |r| Array(r["supported_by"]) + Array(r["out_of_scope_facts"]) }; missing=refs.uniq - facts; puts "YAML OK"; puts "requirements=#{reqs.length}"; puts "referenced_facts=#{refs.uniq.length}"; abort("missing facts: #{missing.join(", ")}") unless missing.empty?; puts "fact refs OK"'
```

There is no chosen application framework yet. TypeScript is probably safer for the take-home review. Clojure/ClojureScript is attractive to the user but may create reviewer friction. Do not choose until the requirements/use-case pass is done or the user explicitly asks to start implementation.
