# AI-Powered Alcohol Label Verification App

This repo starts from a provenance-first requirements process. The goal is to keep a clear line from source material to facts, from facts to requirements, and from requirements to use cases and architecture, so the prototype is built for the right reasons rather than from an unexamined feature list.

The original assignment lives in `assignment.md`. Interview material from that document is split into individual source files under `discovery/sources/`, preserving the raw stakeholder context in small, citable units.

Facts extracted from those sources live in `discovery/facts.yaml`. Each fact has an ID, a statement, source provenance, authority context, and lightweight tags so later design decisions can point back to the claims that motivated them.

Requirements live in `design/requirements.yaml`. They are derived by grouping related facts into design commitments, while leaving contextual or out-of-scope facts available for traceability.

Use cases and architecture will be derived from those requirements next. The current direction favors an asynchronous ingestion and review workflow: label files enter a processing queue, verification results are persisted, and agents review already-processed work with clear status and explanation.
