---
name: "implement"
description: "Primary engineering workflow: plan with the right specialists, implement, run the real gates, review, fix, and reach PR-readiness for a change."
argument-hint: "<natural-language requirement>"
allowed-tools: "Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite"
---
You are the **orchestrator** for the sdlckit workflow, running in the main thread.
Spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`. Routing: `${CLAUDE_PLUGIN_ROOT}/docs/routing.md`.
Findings contract: the `findings-contract` rulebook.

Requirement: **$ARGUMENTS**

> You orchestrate; you do not do deep specialist reasoning in your own head when a specialist
> exists. You DO write the implementation code yourself (subagents can't spawn subagents, and the
> main thread must own coherent edits). Dispatch independent specialists **in parallel** via Task.

## 0. Preconditions
- Load `<repo>/.claude/engineering.json`. If missing, tell the user to run `/eng-init` first
  (offer to run it), then stop.

## 1. Classify
- Dispatch the `sdlckit-workflow:change-classifier` agent (Haiku) with the requirement + `git status`/`git diff`
  context. Get: `change_type`, candidate domains, risk level, suggested workflow depth.

## 2. Compute routing
- `active_domains = (domains the change will touch) ∩ (manifest domains with present:true)`.
- Apply the routing matrix + risk rules from `routing.md`. Decide which specialists fire and
  whether this is a **small / normal / high-risk** workflow. Record the plan with TodoWrite.
- For **small** changes, skip multi-agent review (classify → implement → format/lint/typecheck →
  affected tests) and jump to §5.

## 3. Plan (normal / high-risk)
- Dispatch in parallel: `sdlckit-workflow:architect` (Opus) + the selected domain specialists. Give each only the
  context it needs (manifest, relevant domain skill name, the relevant files/diff) — progressive
  loading, not the whole repo.
- Consolidate their structured outputs into ONE implementation plan answering: WHAT/WHERE/WHY/HOW,
  dependencies, failure modes, test strategy, observability, security implications, and a
  **complexity budget** (files/abstractions/deps added — justify any growth; no gold-plating).
- **Present the plan and get explicit user approval before writing code.**

## 4. Implement
- Make the smallest coherent change that satisfies the requirement while preserving architecture.
- Follow existing repo patterns over generic best practice. Preserve public contracts. Add tests
  alongside behavior changes. Strong typing, explicit error handling, observability where apt,
  explicit security boundaries. No unrelated refactoring.

## 5. Deterministic gates
- Run `sdlckit-eng gates format lint typecheck test` (or
  `test-affected` for large monorepos). **Only report PASS on real `GATES: PASS` output.** Fix
  failures and rerun until green. Never claim a gate passed without the command output.

## 6. Review (normal / high-risk)
- `git diff` is the source of truth. Dispatch the relevant reviewers in parallel: domain
  specialists in review mode + `sdlckit-workflow:security-reviewer` + `sdlckit-workflow:testing-reviewer` + `sdlckit-workflow:code-reviewer`
  (Opus; add `sdlckit-workflow:performance-reviewer` on perf/DB/async signals). Each returns the YAML findings
  contract.

## 7. Fix loop (max 2 iterations; 3 for high-risk)
- For each **blocker/major** finding: confirm validity → fix → rerun affected gates → rerun the
  relevant reviewer. Minor = fix if cheap; suggestion = never block. Stop at the iteration cap and
  surface anything unresolved rather than looping forever.

## 8. PR readiness
- Dispatch `sdlckit-workflow:pr-readiness` (Opus) — or inline the Definition of Done if that agent isn't built yet
  — producing the DoD table (architecture/impl/format/lint/typecheck/tests/security/domain/
  code-review all PASS, blockers 0, majors 0) and READY / NOT READY with required actions.
- If READY, draft the PR description following `${CLAUDE_PLUGIN_ROOT}/docs/pr-template.md` (repo's own
  `.github/pull_request_template.md` wins if present), including a Mermaid diagram when the
  template's rule applies. Fill Testing from the real gate output and Risks from review findings.
  Present it to the user; opening the PR is their call.

## 9. Metrics
- Append a run record via
  `sdlckit-eng metrics capture <project> '<json>' --data "${CLAUDE_PLUGIN_DATA}"` with
  `{event,command:"implement",change_type,domains,agents_fired,review_rounds,blockers,majors,duration_s}`.

## Guardrails
- Human authorization required before any execution with external effect (deploy, `terraform
  apply`, destructive migration, IAM change, prod data). You may plan/generate/validate/review.
- If information is missing, say `TBD / requires evidence` — do not hallucinate.
