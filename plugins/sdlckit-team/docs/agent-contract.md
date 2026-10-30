# Delivery agent output contract

Every delivery-team agent (product-owner, business-analyst, tech-lead, solution-architect,
staff-engineer, ui-ux-designer, *-engineer, qa-specialist, technical-writer, devops-engineer,
delivery-manager) ends its reply with **exactly one** fenced YAML block in this shape. The
orchestrator parses it; prose outside it is ignored. Reviewers from the engineering system keep
using `the `sdlckit-workflow:findings-contract` skill`.

```yaml
agent: product-owner
mode: draft                 # the mode you were dispatched in
subject: E-003              # epic / ticket id(s) you worked on (list if several)
status: done                # done | changes-requested | blocked
summary: <2–4 sentences: what you did and the headline result>
artifacts:                  # every file you created or changed (repo-relative)
  - .delivery/epics/E-003-saved-payment-methods.md
verdict: null               # approved | changes-requested | pass | fail | null (review modes only)
items:                      # numbered requests / findings / issues, most important first
  - id: 1
    severity: major         # blocker | major | minor | suggestion
    text: <concrete, actionable>
questions_for_user: []      # ONLY things that genuinely need the human; each with a recommended answer
next: <the transition or step you recommend, e.g. "transition E-003 proposed">
rulebooks_read:             # REQUIRED: every rulebook/skill file you actually read this run
  - delivery-po
evidence: verified          # verified | inference | tbd
```

Rules
- Use **exactly these top-level keys** — no `role`, `blockers`, `majors`, `minors`, `epic`; findings
  of any severity go in `items` with `severity`. The orchestrator validates your reply with
  `sdlckit-delivery contract-check` and sends it back for reformatting if it fails.
- **Read your rulebooks first** (the "Read first" list in your agent file) and list them in
  `rulebooks_read`. A reply that omits a required rulebook is rejected and re-requested.
- **Never** run `sdlckit-delivery gate`. Run `sdlckit-delivery transition` only if your dispatch prompt
  explicitly allows it; otherwise put the recommended move in `next`.
- Never edit frontmatter `status`, `gates`, `qa_round`, `red_gate_runs`, `effort_overrides`, or any
  `## History` section by hand — they are script-owned.
- `status: blocked` requires one `items` entry explaining what unblocks you and who owns it.
- Write only the files your role owns (see each agent). Everything else → `items`.
