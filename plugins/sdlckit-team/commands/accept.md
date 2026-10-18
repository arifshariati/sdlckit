---
name: "accept"
description: "Acceptance: run the gates on the merged epic branch, show you the epic report, and on your explicit yes mark it done, push the branch and open one PR."
argument-hint: "<E-###>"
allowed-tools: "Bash, Read, Write, Edit, Glob, Grep, Task, AskUserQuestion, Skill"
---
You are the **delivery orchestrator** running the **Acceptance** stage in the main thread.
Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` §8. PR template: the `sdlckit-workflow:pr-template` skill (load it with the Skill tool)
(a repo's own `.github/pull_request_template.md` wins). `D` = `sdlckit-delivery`.

Input: **$ARGUMENTS** (epic id)

## 0. Preconditions
`D show E-###` → must be `in-acceptance`. If `in-delivery`, point to `/sdlckit-team:deliver`; otherwise explain.
`WT=$(D path E-### worktree)`.

## 1. Integration check (deterministic, on the merged epic branch)
In `WT`: run `sdlckit-eng gates <the manifest's full gate list, incl.
build/e2e if configured>`. All tickets passed individually; this proves they pass **together**.
Red → do not present for acceptance as-is: show the failing output, propose a fix ticket (via
tech-lead escalation mode) and stop. Never claim green without `GATES: PASS`.

## 2. Present to the user (the PO)
From `reports/E-###.md` (and `D stats E-###`), show concisely:
- **Outcome:** the WHY and one paragraph on what's now possible.
- **Per-AC table:** AC · status · evidence.
- **How to try it** (commands/routes).
- **Decisions, scope changes, known gaps & follow-ups** (follow-ups proposed as future epics).
- **Release notes** (deploy/migration order, env var names, rollback) if any.
- **Integration gates:** the real result from step 1.
- Path to the full report and to the epic branch for a local look (`git -C <WT> log --oneline <base>..`).

## 3. Ask — AskUserQuestion
Options:
1. **Accept, push and open the PR (Recommended when gates are green and no AC is partial)** —
   this is the user's explicit authorization for the outward-facing steps in §4.
2. **Accept locally only** — mark done, no push.
3. **Reject / changes needed** — collect what's wrong.

Never infer acceptance. Approval of the PR push applies to this epic only.

## 4. On acceptance
1. `D gate E-### acceptance` → epic `done` (records committed on the epic branch).
   If the manifest has `delivery.docs.statusFile`: `D status-md --in E-###`, then commit it on the
   epic branch (`git -C <WT> commit -am "docs(E-###): update status"`) so the PR carries the row.
2. **Option 1 only:**
   - `git -C <WT> push -u origin epic/E-###`.
   - Build the PR body from the template: Summary (outcome), Why (epic WHY), Changes (per ticket:
     `T-### title — one line`, grouped by domain), Diagram (required for this kind of change per the
     template rules — derive from the epic Architecture; validate with
     `sdlckit-eng mermaid <body.md>`), Testing (integration
     `GATES: PASS` summary + QA per-AC evidence), Risks & rollout (release notes). Add an
     "Acceptance criteria" checklist mapping each epic AC to tickets. **No attribution lines.**
   - `gh pr create --base <baseBranch> --head epic/E-### --title "<epic title> (E-###)" --body-file <body.md>`.
   - Show the PR URL.
3. Remind: after the PR merges, `D cleanup E-###` removes the worktrees (branches are kept).
4. Offer follow-up epics from "Known gaps & follow-ups" via `/sdlckit-team:po` (don't create them unasked).

## 5. On rejection
Record the user's notes in the epic `## Decisions for you` (dated), `D transition E-### in-delivery`,
and turn each note into either a ticket change (tech-lead `escalation`/`revise`) or a new ticket
(DoR applies), then tell the user `/sdlckit-team:deliver E-###` continues. Don't touch the gate fields.

## Guardrails
Never push, open a PR, merge, deploy or run remote migrations without option 1 chosen in this
conversation for this epic. Never merge the PR yourself.
