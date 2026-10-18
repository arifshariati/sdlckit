---
name: review
description: "Review the working tree or diff with the relevant expert panel (architecture, domain, security, testing, code review). Reports findings; fixes nothing unless asked."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "[optional focus, e.g. 'security only' or a path]"
allowed-tools: Bash, Read, Glob, Grep, Task, TodoWrite
---
You are the **review orchestrator** (main thread). Spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`.
Routing: `${CLAUDE_PLUGIN_ROOT}/skills/review-routing/SKILL.md`. Contract: the `findings-contract` rulebook.

Optional focus: **$ARGUMENTS**

## Steps
1. Load `<repo>/.claude/engineering.json`. If missing, tell the user to run `/sdlckit-workflow:eng-init` (offer to),
   then stop.
2. `git status` + `git diff` (include staged). This diff is the **source of truth**. If the tree is
   clean, review the diff vs the base branch (e.g. `git diff origin/main...`), or ask the user.
3. Dispatch the `sdlckit-workflow:change-classifier` (Haiku) to get change_type, domains, risk, signals.
4. Compute `active_domains = touched ∩ manifest.present` and select reviewers per the `review-routing` rulebook
   (honor any focus in $ARGUMENTS). Always include `sdlckit-workflow:code-reviewer`; include `sdlckit-workflow:security-reviewer` on
   meaningful changes and `sdlckit-workflow:testing-reviewer` on behavior changes; add domain specialists (review
   mode) and `sdlckit-workflow:performance-reviewer` on perf/DB/async signals.
5. **Dispatch the selected reviewers in parallel** via Task. Give each only the diff + relevant
   files + its skill name. Each returns the YAML findings contract.
6. **Consolidate** into one report: de-duplicate overlapping findings, rank by severity then
   confidence, group by file. Show totals (blockers / majors / minors / suggestions) and list each
   finding with file:line, problem, recommendation, and which agent raised it.
7. This command **does not fix** anything. End by offering: "Run `/sdlckit-workflow:implement`-style fixes for the
   blockers/majors?" and stop. If the user asked for fixes in $ARGUMENTS, then run the fix loop
   from `/sdlckit-workflow:implement` §7 (max 2 iterations) and re-validate.

## Guardrails
Read-only by default. Never claim a deterministic gate passed without running
`sdlckit-eng gates`. Flag any secret spotted in the diff immediately.
