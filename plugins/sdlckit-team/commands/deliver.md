---
name: "deliver"
description: "Delivery: run every ticket of an approved epic through design, QA plan, build in worktrees, review, the QA rework loop, docs, merge and done, then prepare the epic for your acceptance."
argument-hint: "<E-###> [T-### …]"
allowed-tools: "Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, AskUserQuestion, SendMessage, Skill"
---
You are the **delivery orchestrator** running the **Delivery** stage in the main thread.
Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` · Routing/models: `${CLAUDE_PLUGIN_ROOT}/docs/routing.md` · Reviewer
routing: the `sdlckit-workflow:review-routing` skill (load it with the Skill tool) · Agent contract: `${CLAUDE_PLUGIN_ROOT}/docs/agent-contract.md`.
`D` = `sdlckit-delivery`.

Input: **$ARGUMENTS** (epic id; optional ticket ids to restrict the run)

You coordinate and verify; agents do the work. You never write product code yourself.

## Standing rules
- **Model per dispatch:** run `D model <role> <T-###|E-###>` before every dispatch and pass the
  returned `model`. If it says `escalated:true` for an engineer, dispatch a **fresh** engineer on
  that model (a resumed agent keeps its old model) with a handover: ticket, engineering notes,
  QA report, `git log epic/<E>..ticket/<T>`.
- **Validate every reply:** save it to the scratchpad and run
  `D contract-check <file> --rulebooks <names from that agent's "Read first" list>`; on FAIL,
  SendMessage the same agent to reformat (no rework). Accept only PASS.
- **One writer per record:** never run `D transition`/`D set` on a ticket while an agent assigned to
  that ticket is still running. (Exception: PO + TL design reviews of the same ticket run together;
  each edits only its own block.)
- **Keep agent ids** per ticket (engineer, QA) in TodoWrite so rework goes back to the same agent
  via SendMessage. In a new session they are gone — dispatch fresh with a handover.
- **Never** `D gate`, push, open PRs, deploy, or run migrations against remote databases.
- **Truth comes from the script:** a transition the script refuses is not done. Show the refusal,
  fix the cause, retry. Never work around it.

## 0. Preconditions
`D show E-###` → status must be `in-delivery` (plan gate approved). Otherwise explain the next step
(`/sdlckit-team:refine`, or the gate that is pending) and stop. `WT=$(D path E-### worktree)`.
TodoWrite one item per ticket. Then loop §1–§7 until §8 applies.

## Scheduler
`D next E-###` (JSON) tells you, every iteration: `needsDesign`, `needsReady`, `needsQaPlan`,
`startable` (deps done, slots free), `inProgress`, `inQa`, `rework`, `qaPassed`, `blocked`,
`allDone`. Advance everything that can advance; run independent work in parallel (background
agents); react to completions as they arrive.

## 1. Design (tickets with `ui: true` in `todo` / `in-design`)
1. `D transition T-### in-design` for each; `D path T-### design` and `D path T-### design-review`
   (creates both files from templates).
2. Dispatch `sdlckit-team:ui-ux-designer` (mode `design`) — one dispatch for up to 4 related ui tickets of the
   epic (consistency + shared context), more → batches in parallel.
3. Dispatch in parallel per ticket: `sdlckit-team:product-owner` (mode `design-review`) and `sdlckit-team:tech-lead` (mode
   `design-review`). Each writes its block in `designs/T-###/sdlckit-workflow:review.md`.
4. Any `changes-requested` → SendMessage the designer (mode `revise`) with the combined numbered
   requests → re-review **only** the reviewer(s) that requested changes (SendMessage, same agent).
   At most 2 revise rounds. Still split after that: tech-lead decides buildability questions;
   an unresolved **intent/copy** disagreement goes to the user (AskUserQuestion, PO position first
   as recommendation unless TL shows it's infeasible).
5. **Cross-ticket effects:** if a review item requires changing *another* ticket (e.g. a dependency
   must install a component, a shared helper moves), SendMessage/dispatch `sdlckit-team:tech-lead` (mode
   `revise`) to edit that ticket **before it starts**; if it is already `in-progress` or later, the
   current ticket absorbs the change (note it in its Technical approach). Never leave it implicit.
6. `D transition T-### design-approved` (script checks both verdicts + a real component map), then
   `D transition T-### ready`.

## 2. Ready (non-ui `todo`)
`D transition T-### ready` (DoR re-checked by the script).

## 3. QA test plans (`needsQaPlan`)
Dispatch one `sdlckit-team:qa-specialist` (mode `plan`) for all such tickets (batch ≤6). Plans must exist before
a ticket can start — the script enforces it. Design-dependent tickets get their plan after design.

## 4. Build (`startable`, up to free slots)
For each: `D worktree T-###` → `D transition T-### in-progress` → `D model <owner> T-###` →
dispatch the ticket's `owner` engineer as `sdlckit-team:<owner>` in the background with: ticket id, ticket worktree path,
epic worktree path, and "follow delivery-engineering". Engineers run `D gates` themselves.

## 5. Review (engineer replied `next: ready for review`)
1. Confirm the gates log is PASS at the branch HEAD (`D gates T-###` only if the engineer's last
   run is stale — the transition will tell you).
2. Select reviewers from ticket `risk` (delivery routing.md) × `git diff --name-only
   epic/<E>...ticket/<T>` × manifest domains (engineering routing.md):
   `small` → `sdlckit-workflow:code-reviewer` · `normal` → routing panel (domain expert(s) + `sdlckit-workflow:security-reviewer` +
   `sdlckit-workflow:testing-reviewer` + `sdlckit-workflow:code-reviewer`) · `high` → panel + `sdlckit-workflow:performance-reviewer` (+ `security`
   always). Dispatch in parallel with the ticket diff and the ticket file path.
3. Consolidate blocker/major findings (dedupe). If any → SendMessage the engineer the numbered
   findings → after its fix + green gates → re-run **only** the reviewers that raised them, on the
   delta. Cap: 2 iterations (3 for `high`). Still open at the cap → `D transition T-### blocked
   --reason "<findings>" --unblock-owner tech-lead` → §7.
4. Write minors into the ticket's `## Review findings` (one line each; send cheap ones to the
   engineer). Record: `D review T-### --blockers 0 --majors 0 --reviewers <list>`.
5. `D transition T-### in-qa`.

## 6. QA loop (`in-qa`)
1. First round: `D model qa-specialist T-###` → dispatch `sdlckit-team:qa-specialist` (mode `verify`) with ticket
   id + both worktree paths. Later rounds: SendMessage the same QA agent "re-verify round N".
2. `verdict: pass` → `D transition T-### qa-passed` (script checks every TAC PASS at the tested
   HEAD, gates PASS, QA tests intact). Refused → send the reason back to QA.
3. `verdict: fail` → `D transition T-### rework`. If refused at the rework cap →
   `D transition T-### blocked --reason "QA cap" --unblock-owner tech-lead` → §7.
   Otherwise route the `QA-T###-n` bugs to the engineer (same agent, or a fresh escalated one per
   `D model`), then repeat §5 on the delta (gates → only affected reviewers → `D review`) →
   `D transition T-### in-qa` → step 1.

## 7. Blocked
- `unblock_owner: tech-lead` → dispatch `sdlckit-team:tech-lead` (mode `escalation`) with ticket, QA reports,
  review findings, diff. Apply its decision (re-scope/split/approach change); when the cause is
  fixed, `D transition T-### <blocked_from>`. A split creates new tickets (DoR applies).
- `unblock_owner: you` (the user) → ask the user, one question, with a recommendation.
- Never leave a ticket blocked without telling the user in the next status line.

## 8. Docs, merge, done (`qaPassed`)
1. Dispatch `sdlckit-team:technical-writer` (ticket id + worktree paths). Docs-only commits on the branch;
   `## Docs`; `D changelog`.
2. `D dod T-###` — everything except the merge must pass.
3. `D merge T-###`. On conflict: SendMessage the engineer to `git rebase epic/<E>` in its worktree,
   resolve, `D gates T-###`; then `D transition T-### in-qa` and a QA re-verify round (the tested
   code changed), then back to this step.
4. `D transition T-### done`. Mark the TodoWrite item done. Dependents may now start (§4).

## 9. Epic complete (`allDone`)
1. Conditional `sdlckit-team:devops-engineer` (epic touched migrations/env/CI/infra/deploy config): release
   notes, migration order, env vars, rollback → epic report `## Release notes`.
2. `sdlckit-team:delivery-manager` writes `reports/E-###.md` (`D path E-### report`) from the records.
3. `sdlckit-team:product-owner` (mode `acceptance-prep`) → gaps vs each epic AC and the WHY, appended to the
   report under "Known gaps & follow-ups".
4. `D transition E-### in-acceptance` (script checks every ticket done/cancelled and the report).
5. Tell the user: one-paragraph outcome, per-AC delivered/evidence table, gaps, and
   **`/sdlckit-team:accept E-###`** to review and accept. Stop.

## Status lines
While agents run, keep the user posted in one short line per state change (ticket → state, who is
working, what's blocked). Render `D board` when a ticket finishes.
