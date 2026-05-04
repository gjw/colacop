# Submission email — draft

Reply on the original Sam Corcos thread. Subject line should preserve the thread (just hit Reply).

---

Hi Sam,

Thanks again for the opportunity. Submission below.

- **Live:** [https://colacop.foramerica.dev](https://colacop.foramerica.dev) (no login)
- **Repo:** [https://github.com/gjw/colacop](https://github.com/gjw/colacop)

A working prototype. Pairs of label image + application JSON arrive via watched directory or browser upload, Gemini extracts label fields, two layers of verification run (regulatory well-formedness, and label-vs-application comparison), and the reviewer adjudicates with per-finding CFR citations in front of them.

The README's Approach section walks through what I think is the most interesting part — a deliberate source → fact → requirement → use-case pipeline (`discovery/`, `design/`) that traces architecture decisions back to specific stakeholder claims. It is heavier than the assignment requires; the process is part of the submission.

Trade-offs and scope decisions are explicit in the README's "Prototype scope" and "Known limitations" sections — including the one place I diverged from a stakeholder ask: Sarah Chen's batch-upload need is supported via the watcher, but the browser multi-select form was scoped out for the prototype.

Happy to walk through any of it.

Best,
Gabriel

---

## Pre-send checklist

- [ ] Live URL loads, queue populated, Reset demo works on Linux (chokidar fix verified)
- [ ] GitHub repo public; README renders; screenshots show
- [ ] Replying on the original thread (preserves Sam's context)
- [ ] No trailing internal jargon ("Tower", "Trench", bead IDs) in the email body
- [ ] Self-review one cold pass before sending — cut anything defensive
