---
name: "refine"
description: "Refinement: the solution architect designs the epic, the tech lead splits it into tickets, the staff engineer, architect and PO critique it, then stop at the plan gate for your approval."
argument-hint: "<E-###> [revision notes]"
allowed-tools: "Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, AskUserQuestion, SendMessage"
---
You are the **delivery orchestrator** running the **Refinement** stage in the main thread.
Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` · Rulebook: `${CLAUDE_PLUGIN_ROOT}/skills/delivery-tickets/SKILL.md` ·
Agent contract: `${CLAUDE_PLUGIN_ROOT}/docs/agent-contract.md` · Routing: `${CLAUDE_PLUGIN_ROOT}/docs/routing.md`.
`D` = `sdlckit-delivery`.

Input: **$ARGUMENTS** (first token = epic id; the rest = optional revision notes from the user)

You coordinate; agents do the thinking. Give each agent only: epic id, epic worktree path, the
files it must read, its mode, and (for revise) the consolidated items. Before every dispatch run
`D model <role> <E-###>` and pass the returned `model` and `effort` to the Agent tool.

## Validating every agent reply (applies to every dispatch below)
After each agent returns, write its final reply to a temp file in the scratchpad and run
`D contract-check <file> --rulebooks <comma-list of the rulebook names its agent file says to read>`.
On `CONTRACT FAIL`, SendMessage the same agent: "Reformat your last reply to the contract:" + the
error lines (cheap — no redo of the work). If `rulebooks_read` was missing a rulebook, ask it to read
that rulebook and re-check its conclusions against it. Accept only `CONTRACT PASS` replies.

## 0. Preconditions
- `D show E-###`. Status must be `approved`, or `planned` (re-plan: run `D transition E-### approved`
  first, with the user's revision notes). Anything else → explain and stop.
- `D cut E-###` → prints the epic worktree path `WT` (idempotent). All agents read code in `WT`.
- If tickets already exist for the epic (`D list tickets`), this is a resume/re-plan: skip step 1
  unless the notes concern architecture, and run step 2 in mode `revise`.
- TodoWrite: architecture · breakdown · critique round 1 · (round 2) · plan gate.

## 1. Architecture
Dispatch `sdlckit-team:solution-architect` (mode `design`, epic id, `WT`). It writes `## Architecture` + ADRs.
Read its YAML. Surface `questions_for_user` now only if they block decomposition (one at a time,
with its recommendation); otherwise carry them to *Decisions for you*.

## 2. Breakdown
Dispatch `sdlckit-team:tech-lead` (mode `breakdown`, epic id, `WT`). **Keep its agent id** — revisions go back
to the same agent with SendMessage so it keeps its context (cheaper than a fresh dispatch).
Then verify yourself: `D dor T-###` for every ticket; `D next E-###` sanity (no orphan deps).

## 3. Critique round (parallel, conditional)
Dispatch in ONE message, in parallel:
- `sdlckit-team:staff-engineer` (mode `critique`) — **only if** any ticket has `risk` normal/high or the epic is `risk: high`.
- `sdlckit-team:solution-architect` (mode `conformance`).
- `sdlckit-team:product-owner` (mode `breakdown-check`).
Consolidate their `items`: dedupe, keep severity, drop suggestions unless trivial to apply.

## 4. Revise
1. **Architecture first (sequential, never in parallel with the tech-lead):** if the
   solution-architect's conformance reply confirmed tech-lead additions or named gaps in its own
   Architecture/ADRs, SendMessage the same solution-architect (mode `design`, amendment only —
   "touch ONLY ## Architecture and ADR files") and wait for it. Its `items` (new/changed contract)
   are added to the consolidated list. Running both at once lets the design change under the
   tech-lead and the tickets drift from the contract.
2. SendMessage the consolidated items (critique + architect amendments) to the same tech-lead
   (mode `revise`). It fixes or rejects each; rejected blockers go to `## Decisions for you`.
**Second round** (≤ `delivery.refinementRounds`, default 2) only if a staff-engineer or
solution-architect **blocker** was raised in round 1: re-dispatch only the reviewer(s) that raised
blockers, then one more `revise`. Never a third round — remaining disagreements go to the user.

## 5. Lock the plan
- `D transition E-### planned`. The script enforces: epic cut, ≥1 ticket, every ticket passes DoR,
  every epic AC traced. On refusal, send the exact errors to the tech-lead (`revise`) and retry.
- `D board`.

## 6. Plan gate — STOP for the user
Present, compactly:
1. **Architecture summary** (5–8 bullets) + ADR list (title, decision, one line each).
2. **Ticket table:** id · title · domain · ui · risk · depends on · traces (from the epic Plan).
3. **Dependency graph** (the mermaid from the Plan) and the parallel waves.
4. **Decisions for you** — each with both positions and the recommendation. Ask each one
   separately with AskUserQuestion (recommended first) and record the answer in the epic
   (tech-lead patches tickets via SendMessage if an answer changes them).
5. **Cost preview:** count of ui tickets (designer runs), tickets per risk tier, and the effort
   level in effect.
Then ask: **Approve plan** / **Revise** (take notes → step 4 with the notes, max one extra round
before asking again) / **Re-architect** (→ step 1).
**Only on explicit approval:** for each ADR run `D set ADR-### status=accepted` and update its `- Status:` line, then
`D gate E-### plan`. Never infer approval.

## 7. Report
`D board`. Tell the user: `/sdlckit-team:deliver E-###` starts design → build → QA, or `/sdlckit-team:team` runs everything
approved up to the next gate.

## Guardrails
- No code changes in this stage; only `.delivery/` records in the epic worktree.
- Never edit `status`/`gates` by hand. Never `D gate` without explicit approval for this epic.
- Nothing is pushed. Record commits happen only at the script's checkpoints.
