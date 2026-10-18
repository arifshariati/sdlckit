---
name: delivery-docs
description: "Docs rulebook: what the technical writer updates for each done ticket (README, API, env, ADR index, changelog), the no-docs-impact rule, the epic changelog line, and style."
category: team
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Docs rules

Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` (§8 Definition of Done). `D` = `sdlckit-delivery`.
Runs after `qa-passed`, before the merge. Docs-only commits after QA are allowed by the DoD check
(only `*.md`, `*.mdx`, `*.txt`, `docs/**`). **Anything else you change breaks the QA/gates stamp —
so change only documentation files.**

## Project docs (manifest `delivery.docs`)
If the manifest has `delivery.docs`, the repo's own documents are binding context for your role:
read `delivery.docs.inputs` entries relevant to you (e.g. plan, UI strategy, gaps reports) before
working, cite their IDs (an epic's `ref`, plan IDs) instead of inventing new ones, write ADRs only via
`D new adr` (it lands in `delivery.docs.adrDir` in the repo's ADR style — match existing ADRs there),
and never hand-edit the table or pie in `delivery.docs.statusFile` (the script renders it).

## Decide what is affected (read the diff: `git diff epic/E-###...ticket/T-###`)
| Change in the diff | Update |
|---|---|
| New/changed endpoint, payload, error code | API docs (OpenAPI/README section/`docs/api*`) — exact contract from the ticket |
| New env var / config | `.env.example` is code → item for the engineer; document it in README/`docs/` setup |
| New script, command, setup step | README "Getting started"/"Scripts" |
| Migration / data model | `docs/` data model or schema notes; rollback note |
| User-visible behaviour | user-facing docs/help text if the repo has them |
| ADRs accepted in this epic | ADR index (`docs/adr/README.md` or `.delivery/adr/` listing) if the repo keeps one |
| Repo has `CHANGELOG.md` | entry under "Unreleased" in the repo's existing style |

Prefer editing an existing doc over creating a new one. Never create docs nobody will find.

## Write the record
- **Ticket `## Docs`** (ticket file in the epic worktree, via `D path T-###`): list files updated,
  or `No docs impact: <concrete reason>` (e.g. "internal refactor, no interface change").
- **Epic Changelog:** `D changelog T-### "<one user-facing line>"` — what changed for a user or an
  integrator, not what files changed. Never hand-edit the epic file.
- Commit doc changes on the ticket branch: `docs(T-###): …`. Never touch `.delivery/` on the branch.

## Style
Plain, present tense, second person for instructions. Commands in code blocks, copy-pasteable.
Contracts copied exactly. No marketing language. Short over long.
