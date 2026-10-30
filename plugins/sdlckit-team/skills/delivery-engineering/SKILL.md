---
name: "delivery-engineering"
description: "Shared workflow for every team engineer: work in the ticket worktree, build to the criteria and contract, commit, run the gates, write engineering notes, handle rework, and never touch records or QA's tests."
---
# Engineering workflow (delivery)

Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md`. `D` = `sdlckit-delivery`.
Your domain quality bar is your `eng-*` rulebook(s) plus the `sdlckit-workflow:eng-testing` skill (load it with the Skill tool);
UI engineers also follow the `sdlckit-frontend:ui-craft` skill (load it with the Skill tool).

## Project docs (manifest `delivery.docs`)
If the manifest has `delivery.docs`, the repo's own documents are binding context for your role:
read `delivery.docs.inputs` entries relevant to you (e.g. plan, UI strategy, gaps reports) before
working, cite their IDs (an epic's `ref`, plan IDs) instead of inventing new ones, write ADRs only via
`D new adr` (it lands in `delivery.docs.adrDir` in the repo's ADR style — match existing ADRs there),
and never hand-edit the table or pie in `delivery.docs.statusFile` (the script renders it).

## Where you work
- **Code:** only in the ticket worktree you are given (`D path T-### worktree`), on branch
  `ticket/T-###`. `cd` there first. Never touch the main checkout or other worktrees.
- **Records:** the ticket file lives in the *epic* worktree (`D path T-###`). You may edit **only**
  its `## Engineering notes` section. Never edit `.delivery/` inside your ticket worktree — the
  merge is refused if your branch changes it.

## Before you write code
1. Read the ticket (Context, TACs, Technical approach, Design link), the epic `## Architecture`
   contract it quotes, and the ADRs it names. If `ui: true`, read `designs/T-###/design.md` — it is
   binding: components, states, copy and a11y exactly as specified.
2. Read the QA test plan (`D path T-### qa-plan`) — it tells you how you'll be judged.
3. Read the code the approach points at, and one existing example of the same pattern.
4. If the approach is wrong or impossible given the real code, **stop and report** (`status:
   blocked`, item for tech-lead) instead of improvising a different design.

## Building
- Smallest change that satisfies every TAC; follow existing patterns; no unrelated refactors.
- Contracts (routes, payloads, error codes, types) **exactly** as in the ticket. If you think the
  contract must change, that is a blocked item for the tech-lead, not a silent edit.
- Tests: add the unit/integration tests the approach asks for, alongside the code. QA adds the
  acceptance tests — don't duplicate them, and **never modify files QA locked** (`qa/T-###/tests.lock`;
  the script refuses the transition if you do).
- Security & data: validate input at boundaries, authz on every access, no secrets in code/logs,
  migrations reversible.
- UI tickets: build exactly to design.md, then **render and look** (ui-craft visual-review: run the
  app, screenshot mobile + desktop, light + dark, each state you can reach) and fix what you see.
  Save screenshots under the epic worktree `.delivery/qa/T-###/evidence/eng-*.png` (gitignored) and
  list them in your notes.
- Commit in small, meaningful commits on `ticket/T-###` (`feat(T-###): …`, `fix(T-###): …`,
  `test(T-###): …`). No attribution trailers. Never push.

## Gates (you run them; the orchestrator trusts only the log)
`D gates T-###` runs the manifest gates in your worktree and records PASS/FAIL against your HEAD.
Iterate until `gates: PASS`. Never claim a gate passed without that output. After 2 consecutive
red runs you may be escalated to a higher effort level — say clearly what is failing and why.

## Engineering notes (in the ticket file, epic worktree)
What you built (files), decisions within the approach, deviations (with reason), things found in
the codebase the plan didn't know (e.g. "SupabaseService is service-role: verified at …"),
screenshots, follow-ups. Keep it short and factual.

## Rework protocol (QA or review sends you back)
You'll be messaged with numbered findings (`QA-T###-n` or reviewer ids). For each: reproduce →
fix → add/adjust **your** tests → `D gates T-###` → note "finding n → fix (commit sha)". Do not
argue with QA by editing its tests; if you believe a QA finding contradicts the ticket, say so in
`items` (severity major) and let the tech-lead decide.

## Reply
End with the YAML from `${CLAUDE_PLUGIN_ROOT}/docs/agent-contract.md`: `artifacts` = files changed,
`items` = blockers/deviations/follow-ups, `next` = `"ready for review"` once gates PASS at HEAD.
