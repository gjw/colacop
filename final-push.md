# Final push checklist

Submission deliverables: live URL + repo + email reply to Sam Corcos.
Phases 1, 2, 4 can interleave. Phase 3 gated on phase 1. Phase 5 gates everything.

## Phase 0 — Grooming (decisions to make)

- [x] **G1.** cc-ky5 placed in upload-form help block; copy: "Running locally? Drop label/JSON pairs into `data/incoming/` — the watcher picks them up."
- [x] **G2.** Two screenshots: queue + job detail. Saved to `docs/screenshots/`. Annotated with red rectangles + numbered callouts (≤3 per shot) if Skitch works out; plain otherwise.
- [x] **G3.** Limitations inventory mapping → `notes/limitations-inventory.md` (Buckets A/B/C).
- [x] **G4.** Three-terminal flow documented; no `dev` script, no new dep. Devs can adapt their own workflow.
- [ ] **G5.** Submission format: plain reply / cover-letter attachment / `docs/submission-email.md` checked in.
- [x] **G6.** Path mismatch in ARCHITECTURE.md (`/opt/colacop` → `~/colacop`); also synced `seed:demo` step into the deploy block.
- [ ] **G7.** Provenance narrative shape: inline README section vs new `docs/provenance.md`.

## Phase 1 — cc-ky5 ship + redeploy

- [x] `git checkout -b task/ky5-watcher-hint`
- [x] `br update cc-ky5 --claim`
- [x] Apply G1: edit component, add hint line.
- [x] `npm run typecheck` (clean) and `npm run test` (111/111). `npm run lint` has 2 pre-existing errors in ecosystem.config.cjs (CommonJS require — PM2 needs that file CJS); not caused by ky5.
- [ ] Local smoke (dev:server + dev:worker + dev:web) — Chair to do or skip.
- [x] Commit `Add data/incoming hint to upload form (cc-ky5)` (sha ba7b29b).
- [x] `br close cc-ky5`, `br sync --flush-only` (no dirty), beads state committed.
- [ ] Merge `task/ky5-watcher-hint` to main (Chair).
- [ ] Deploy: ssh, `git pull && npm ci && npm run migrate && npm run seed:demo && npm run build && pm2 reload ecosystem.config.cjs`.
- [ ] Live smoke: hint visible, queue populated.

## Phase 2 — cc-64v README content

Branch `task/64v-readme-final`, claim cc-64v.

- [x] Top: retitled to "agent-assisted TTB label pre-review"; live URL as blockquote above the fold; stance paragraph (recommendation-not-decision, "right about why it might be wrong") with pointer to ARCHITECTURE.md § Tool Positioning & Vocabulary.
- [x] Approach: pipeline bullets + provenance walk subsection with real S/F/REQ IDs traced to UC-001 and ARCHITECTURE.md.
- [x] Approach: runtime correctness one-liner (Bucket B from G3 — race-free upsert + rehydration).
- [x] Local development section: G4 applied; three-terminal run; "Verify it works" step; `POSTGRES_PORT` note; single-worker reminder.
- [x] **Prototype scope** section (system-level).
- [x] **Known limitations and scope decisions** section from G3 mapping.
- [x] **Provenance narrative** per G7 (inline, real S/F/REQ/UC IDs in the Approach Provenance walk subsection).
- [x] Pointers: integrated inline rather than as a standalone section — UC-001 in Provenance walk, ARCHITECTURE.md § Tool Positioning & Vocabulary in stance paragraph, repo layout section retained for top-level files. Standalone Pointers section judged redundant.
- [x] "How the live deployment is updated" — tightened: dropped apologetic preamble, collapsed idempotency notes, kept agave-as-known-issue.
- [x] Screenshot embedding done with numbered tours.
- [x] README reordered per Chair: stance/intro → Approach → screenshots → What it does → mechanics. Differentiator before mechanism.
- [ ] Hold cc-64v open until phase 4 complete.

## Phase 3 — Screenshots (gated on phase 1 live)

- [x] Captured both screenshots (annotated with red rectangles + numbered callouts in CleanShot X).
- [x] Saved to `docs/job-queue.png` (3 callouts) and `docs/job.png` (5 callouts) — kept under `docs/` rather than `docs/screenshots/`, fewer indirection.
- [x] Embedded into README under new `## What it looks like` section between Approach and What it does, with numbered tour prose under each.
- [ ] Verify rendering on GitHub once pushed.

## Phase 4 — Repo-wide documentation pass

- [ ] `assignment.md` — original, untouched.
- [ ] `discovery/sources/` S-001..S-007 — nothing orphaned, nothing missing.
- [ ] `discovery/facts.yaml` F-001..F-043 — spot-check F-042, F-045, F-057.
- [ ] `design/requirements.yaml` REQ-001..010 + REQ-011 — every req has delivered referent or known-limitations entry.
- [ ] `design/use-cases.yaml` UC-001 — exists and matches README pointer.
- [ ] `ARCHITECTURE.md` — G6 applied; still: resolve Knex/Kysely residue; verify deploy section matches box end-to-end.
- [ ] `CONTEXT.md` — Knex→Kysely; deadline line updated.
- [ ] `docs/handoff.md` — keep (date-stamped) vs remove. Decide.
- [ ] `notes/sprint-order.md`, `notes/friction.md` — read-through; keep.
- [ ] `CLAUDE.md`, `prompts/*` — read-through; keep visible.
- [ ] Crosslink check: every README/ARCHITECTURE link resolves; every F-/REQ-/S-/UC- ID exists.
- [ ] Secrets sweep: `git grep -i 'AIza\|sk-\|secret\|password'`; confirm `git ls-files | grep -E 'env'` only returns `.env.example`.
- [ ] README repo-layout block matches actual `ls`.
- [ ] Node version consistency: `package.json` engines, `.node-version`, ARCHITECTURE prose.

## Phase 5 — Submission

- [ ] Walk `assignment.md` acceptance criteria; one-line "where this lives" against each.
- [ ] Final live smoke in clean incognito: URL → queue → job detail with CFR citations → upload → Reset demo.
- [ ] Final repo polish commit; close cc-64v; `br sync --flush-only`; merge.
- [ ] Draft submission email per G5: live URL, repo URL, one-paragraph framing, README pointer, time spent, thanks.
- [ ] Self-review email cold; cut anything defensive.
- [ ] Send (reply on original Sam Corcos thread).
- [ ] Tag commit `submitted-2026-05-XX`, push tags.
- [ ] Update CONTEXT.md status line to "Submitted YYYY-MM-DD".

## Critical-path notes

- `G1 → Phase 1 → Phase 3` is the only hard chain.
- `G3, G4, G5, G6, G7` block phase 2 sub-items but not each other.
- Phase 4 can run any time before phase 5.
