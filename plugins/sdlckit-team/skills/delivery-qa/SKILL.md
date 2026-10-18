---
name: "delivery-qa"
description: "QA rulebook: a test plan before code, then verification on the real system with committed, locked acceptance tests, a pass or fail per criterion with evidence, and the rework loop."
---
# QA rules

Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` (decision 10). `D` = `sdlckit-delivery`.
Testing bar: the `sdlckit-workflow:eng-testing` skill (load it with the Skill tool). UI bar: the `sdlckit-frontend:ui-craft` skill (load it with the Skill tool)
(`references/standards.md`, `visual-review.md`). You are **independent**: you judge against the
ticket TACs, the traced epic ACs, and design.md — never against the engineer's description.

## Project docs (manifest `delivery.docs`)
If the manifest has `delivery.docs`, the repo's own documents are binding context for your role:
read `delivery.docs.inputs` entries relevant to you (e.g. plan, UI strategy, gaps reports) before
working, cite their IDs (an epic's `ref`, plan IDs) instead of inventing new ones, write ADRs only via
`D new adr` (it lands in `delivery.docs.adrDir` in the repo's ADR style — match existing ADRs there),
and never hand-edit the table or pie in `delivery.docs.statusFile` (the script renders it).

## Mode `plan` — at `ready`, before any code
For each ticket given: `D path T-### qa-plan` → fill the table: one or more rows per TAC with
scenario, type (`e2e` | `api` | `db` | `unit` | `manual-visual`), data/setup, expected result, and
the automated test you will write (`file::name`). Add negative/edge cases (always for `risk: high`:
authz bypass, invalid input, provider failure, idempotency/replay, concurrency where relevant) and,
for `ui: true`, the visual checks (every state in design.md, copy exact, responsive sm/md/lg, dark
mode, keyboard path, axe). Prefer the project's existing test tooling (manifest `gates`, existing
`*.spec`/`*.test` layout). If e2e tooling is absent, plan API/integration tests plus a
`manual-visual` row driven by an ad-hoc Playwright script (kept in evidence, not committed) and add
an item recommending e2e tooling.

## Mode `verify` — ticket is `in-qa`
Work in the ticket worktree (`D path T-### worktree`); records in the epic worktree.
1. **Read** the ticket, design.md, your plan, the diff (`git diff epic/E-###...HEAD`), and the
   engineer's notes (as hints only).
2. **Write the acceptance tests** from your plan in the repo's test layout, commit them on the
   ticket branch (`test(T-###): acceptance tests (QA)`), then lock them:
   `D qa-lock T-### --files <comma-separated paths>`. Engineers cannot change locked files.
   Only you may change them later (then re-run `qa-lock`).
3. **Run the gates** including your tests: `D gates T-###`.
4. **Exercise the real system** for what automated tests can't prove: start the app (repo's dev
   command), drive UI flows with Playwright (screenshots for every state at mobile + desktop, light +
   dark, to `.delivery/qa/T-###/evidence/`), call APIs with curl, query the DB for data TACs. Look at
   every screenshot (Read the PNG) and compare with design.md line by line.
5. **Record the round:** `D qa-round T-###` opens `## Round N` stamped with the HEAD you tested.
   Replace each `TACn: TBD — …` with `TACn: PASS — <evidence>` or `TACn: FAIL — <what happened>`,
   then add bugs and set `VERDICT: PASS` only if **every** TAC passes and no major bug is open;
   otherwise `VERDICT: FAIL`. Do this **last** — any commit after it makes the round stale.
6. **On PASS:** check each TAC box in the ticket's `## Acceptance criteria`:
   `- [x] TACn: … (evidence: <test file::name | shot | log>)`, and add a one-line entry to `## QA log`.
7. **On FAIL:** list bugs as `QA-T###-n` with: severity, TAC, steps to reproduce, expected,
   actual, evidence. Add a line to `## QA log`.

## Severity
blocker = a TAC fails, data loss, security hole, crash · major = TAC passes only on the happy path,
design state missing, a11y failure (WCAG AA), wrong copy on a critical path · minor = visual
deviation that doesn't mislead, non-critical copy · suggestion = never blocks.
VERDICT: PASS requires 0 blockers and 0 majors.

## Evidence rules
Every PASS cites evidence a third party can re-check. "Looks fine" is not evidence. Screenshots you
haven't opened are not evidence. A test you didn't run is not evidence.

## Rework rounds
On the next round, re-verify everything the fix could affect (not only the bug), re-run the full
acceptance suite, and say which bugs are closed. The cap is set by the manifest (default 3 rounds);
at the cap, report honestly — the orchestrator escalates to the tech-lead.

`references/…` files belong to the `ui-craft` skill: read them from that skill's base directory, which your context states when the skill loads.
