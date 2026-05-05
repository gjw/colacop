# colacop — what this was, in case you forget

Hello, future-Gabriel. You're reading this because you bumped into this repo
five years on and can't remember what it was for. Here's the short version,
plus everything that's worth a moment of your time.

## TL;DR

- **What:** A take-home prototype for **agent-assisted TTB COLA pre-review** — a
  tool that reads alcohol-bottle label images, compares them against TTB
  regulation and the producer's submitted application data, and produces an
  evidence-rich recommendation a human compliance specialist adjudicates.
- **When:** 2026-04-28 → 2026-05-04 (~7 days of intense solo + multi-agent work).
- **Why:** Job opportunity. The hiring org modernizes federal regulatory
  workflows; the take-home was the gate. Also a personal experiment in pushing
  the source-driven discovery workflow further than I'd ever pushed it before.
- **Live URL:** https://colacop.foramerica.dev (was; may or may not still be
  running — Linode 16 GB box `linode43393`, `/opt/colacop`, PM2-managed).
- **State at submit:** Working live URL, 6 real-bottle fixtures, two-layer
  verification, decision UI with adjudication framing, override-detection,
  CFR-citation-linked verdict messages, README with full provenance trail.

## What it actually does

Reviewer (TTB compliance specialist) lands on a queue of submitted COLA
applications. Each application is a label image + a JSON file with the
producer's claimed values (brand, class/type, ABV, net contents, producer
name/address, country of origin). For each application:

1. **Layer 1 (label vs regulation):** runs unconditionally. Checks the
   government warning text against 27 CFR 16.21 verbatim, ABV format against
   27 CFR 4.36, mandatory-field presence (brand/class/etc.). Emits a
   per-field verdict (pass / fail / needs_review) with the offending CFR
   citation in the message.
2. **Layer 2 (label vs application):** runs when the JSON is supplied.
   Compares each field. Hybrid: deterministic where TTB requires exactness
   (warning, ABV format, net contents normalization); LLM-assisted where
   compliance practice tolerates drift (brand name fuzzy match, class/type).
3. **Findings render side-by-side** with the extracted-from-label value and
   the application-supplied value, plus the cited CFR section as a clickable
   ecfr.gov link.
4. **The specialist adjudicates** — Approve / Reject / Send back, with an
   optional note. If their decision diverges from the tool's overall
   recommendation, the system logs that as an *override* and surfaces it as a
   badge. The overrides are training-data signal: where rules-as-coded
   diverge from rules-as-practiced.

The browser upload form takes one pair at a time; local installations can
also drop pairs directly into `data/incoming/` and the chokidar watcher picks
them up. A "Reset to demo state" button clears everything and live-reseeds 3
canonical fixtures so the next reviewer lands on a populated queue.

## Why this approach to the problem (worth remembering)

The most important framing decision was distinguishing **review** (the human's
regulatory action) from **recommendation/screening** (the tool's output). A
TTB COLA review is a regulatory action of record taken by a human exercising
delegated authority. Calling the tool a "review" muddies who decided what,
and in a regulatory or audit context that's a real problem — not a stylistic
one. The tool produces a *recommendation, with evidence*; the human
adjudicates. This vocabulary is locked in `ARCHITECTURE.md` ("Tool
Positioning & Vocabulary") and lands in every UI label, README phrase, and
button text. **The job of the tool is not to be right. Its job is to be
right about why it might be wrong.** A flag like "alcohol content statement
may violate 27 CFR 4.36(b)(1) because [reason]; confidence medium" lets the
specialist adjudicate in seconds; "rejected" forces them to redo the work.

That insight came from a mid-project conversation with a friend (captured in
the cc-syy bead notes and the ARCHITECTURE.md vocabulary section). Worth
remembering for any future "AI in regulatory workflow" product — the framing
has political and procurement consequences far beyond the code.

## The workflow experiment (the real reason to keep this repo)

This was the **first real test** of a discovery workflow I'd been sketching
for a while. The chain:

```
discovery/sources/         (S-001 .. S-007 markdown files)
  - real interviews, regulatory excerpts, supply-chain risk notes
  - each is a primary source with provenance
discovery/facts.yaml       (F-001 .. F-057)
  - distilled facts from sources, each tagged back to its source(s)
design/requirements.yaml   (REQ-001 .. REQ-012)
  - requirements derived from facts, each citing the facts that support it
design/use-cases.yaml      (UC-001 only, deliberately)
  - Cockburn-style "user goal" use case with rich extensions
  - independent of stack/architecture
ARCHITECTURE.md
  - stack and architectural decisions, derived from requirements
notes/sprint-order.md
  - tier-ranked, dependency-aware execution plan, replanned multiple times
.beads/                    (br tracker)
  - tasks with priority, dependencies, design notes, acceptance criteria
```

**What worked:**

- The provenance chain S-### → F-### → REQ-### → UC-### survived every
  scope-change conversation. When something felt off, you could walk back to
  the source and check. Several beads got cut because they had no
  upstream-fact justification.
- One main use case (UC-001) with extensions beat the temptation to write a
  scattershot UC-001/UC-002/UC-003. Forces you to think about the user's goal
  rather than the system's features.
- The Tower/Trench/Chair multi-agent split (see `prompts/tower.md` and
  `prompts/trench.md`) kept context windows small. Tower replans, Trench
  ships one task per fresh agent session, Chair coordinates and merges.
  Sprint plan got rewritten ~6 times across the week without losing thread.

**What was clunky:**

- Too many sprint replans early on; settled into a rhythm by mid-week.
- Tower commits accidentally landed on Trench branches twice (search the
  reflog for `task/syy-decision-step` and `task/2sa-live-reseed-...`).
  Worth a CLAUDE.md hook for next time.
- The verbatim-extraction prompt change (cc-7v3) silently regressed verdicts
  on 4 of 6 fixtures because the smoke test wasn't re-run after the prompt
  fix. Caught at the next replan (cc-0ue). Lesson: every prompt change is a
  full-fixture regression risk; gate prompt changes on a fixture-replay
  smoke.

## What's worth stealing for future projects

In rough order of "I will probably want this again":

1. **The discovery folder layout.** `discovery/sources/` for markdown source
   notes, `discovery/facts.yaml` for cross-referenced facts, `design/` for
   requirements + use cases. The provenance discipline is what makes scope
   conversations productive.
2. **Tower/Trench/Chair role split + bead tracker.** See `prompts/`,
   `notes/sprint-order.md`, and `.beads/`. The "fresh agent per task" rule
   is load-bearing.
3. **Tool positioning vocabulary table.** `ARCHITECTURE.md` "Canonical
   vocabulary" section. Reusable for any AI-assists-human-decider product.
4. **Two-layer verification model.** Layer 1 unconditional (rule-based);
   Layer 2 conditional on additional input (comparison-based). Generic
   pattern: applies to any "X vs regulation" + "X vs claim" verification
   problem.
5. **Override-as-training-signal.** When the human decision diverges from
   the tool's recommendation, log it. See `cc-cm5` design and the
   `decisions.is_override` column. Almost free to implement; surfaces where
   your rules-as-coded miss reality.
6. **Live-reseed on Reset.** The reset button drops fresh fixtures into the
   watcher path so the reviewer watches real extraction in real time. See
   `scripts/seed-fixtures.ts` and the reset endpoint in `src/server/routes/`.
7. **CFR-citation linker (or any structured-citation linker).** Detect
   citation patterns in plain-text messages, render as anchors. See
   `cc-wrn` and the renderer in `src/web/`. ~30 lines, big perceived value.
8. **Verbatim extraction + verdict tolerance.** Don't ask the LLM to
   normalize; ask it to extract verbatim and let your verification logic
   absorb the natural variation ("CONTENT 750 ML", "PRODUCT OF THE USA").
   You can audit verbatim; you can't audit a normalized hallucination.

## Stack

- Node 24, TypeScript strict (no `any`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`).
- React + Vite (frontend), Express (API), Chokidar (watcher), Multer (upload),
  Zod (boundary validation), Kysely (typed SQL), Postgres (Docker Compose).
- PM2 ecosystem on the VPS, nginx in front, wildcard Let's Encrypt cert.
- Google Gemini 3.1 Pro Preview for vision/extraction. Provider behind a
  small `LabelProvider` interface; `analyzeLabel(image) → ExtractedFields`
  is the entire contract. `verifyLabel` is domain logic in
  `src/core/verification.ts`, not on the provider — keeps swap-test trivial.
- Anthropic deliberately excluded — see `discovery/facts.yaml` F-042 (Trump
  administration ordered federal agencies to stop using Anthropic; using it
  in a TTB-facing prototype would have signaled not having read the source
  material). xAI also excluded (vision still beta). OpenAI was the fallback.

## Repo navigation

| You want | Look at |
|---|---|
| What the project does + why this stack | `ARCHITECTURE.md` |
| The framing/vocabulary insight | `ARCHITECTURE.md` § "Tool Positioning & Vocabulary" |
| The user's goal | `design/use-cases.yaml` UC-001 |
| What requirements drove what | `design/requirements.yaml` |
| What facts back the requirements | `discovery/facts.yaml` |
| What sources back the facts | `discovery/sources/` |
| How agents collaborated | `prompts/tower.md`, `prompts/trench.md`, `CLAUDE.md` |
| Final sprint state | `notes/sprint-order.md` |
| Closed work history | `git log` (77 commits) and `br list --status closed` (37 beads) |
| Per-bead design + acceptance + closure notes | `br show <id>` |
| Domain types + Zod schemas | `src/core/schemas.ts` |
| Verification logic (Layer 1 + Layer 2) | `src/core/verification.ts` |
| Provider interface + Gemini implementation | `src/core/providers/` |
| DB schema | `src/db/schema.ts` + `src/db/migrations/` |
| Worker (chokidar + processing pipeline) | `src/worker/` |
| API routes | `src/server/routes/` |
| UI | `src/web/` |
| Deploy artifacts | `ecosystem.config.cjs`, `deploy/`, `docker-compose.yml` |
| Discarded planning notes (don't trust) | `docs/historical/handoff.md` |

## How to revive (if you really want to)

```sh
# Local
docker compose up -d db
npm install
npm run migrate
npm run seed:db        # live-reseeds 3 demo fixtures via the watcher
npm run dev            # web + worker

# Live (the box may or may not still exist)
ssh root@linode43393.foramerica.dev
cd /opt/colacop
git pull && npm ci && npm run migrate && npm run build && pm2 reload ecosystem.config.cjs
```

You'll need `GEMINI_API_KEY` in the env. Without it, the worker silently
falls back to a stub provider that returns merlot for everything. The
fallback is intentional (CI/tests want it) — see `cc-g87` closure note for
why we chose to document rather than UI-flag.

## What did NOT get built (so future-you isn't confused)

These were filed and explicitly cut. Each closure note records the rationale:

- **Edge fixtures** (cc-htd) — front-only crops, lowercase warning, bad
  photography. Cut because the 6 real bottles + reviewer-driven
  mismatched-pair uploads cover the failure-mode story.
- **Multi-select upload** (cc-9wh) — cut in favor of cc-ky5's UI hint about
  the local watcher-drop path.
- **Gemini 429 backoff** (cc-lm6) — cut because reset's 3-fixture burst
  stays under tolerance in practice.
- **Per-finding adjudication overrides** (cc-q25) — label-level decisions
  only; per-finding deferred as future work.
- **Stub-provider UI cue** (cc-g87) — documented; live env has the key set.
- **Worker single-writer guarantee** (cc-egk) — PM2 enforces in production.
- **Cross-restart extraction cache** (cc-uhc) — subsumed by the
  rehydrate-on-second-pass fix in cc-hy3.
- **L2 column-table polish** (cc-55c) — current card layout is
  functionally equivalent and more readable on narrow viewports.

## Personal note

This was the most ambitious thing I'd run with the multi-agent setup. The
discovery-to-shipped-prototype loop in 7 days with one human and several
parallel Claude Code sessions felt like a real preview of how I want to work
on solo projects going forward. The bead tracker + Tower replans gave the
"team meeting" rhythm that solo work usually lacks.

If you came back to this because you're starting another regulated-domain
prototype: the ARCHITECTURE.md vocabulary section and the discovery folder
layout are the two things to copy first. Everything else is downstream.

Good luck out there.
