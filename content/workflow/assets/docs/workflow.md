# sdlckit workflow

The engineering workflow behind `/implement`, `/fix`, `/investigate`, `/review`, `/pr-ready`,
`/eng-init`, `/eng-learn` and `/eng-report`. It plans a change with the right specialists, makes it,
proves it with the project's real gates, reviews the diff, and stops at PR-readiness.

## 1. Core principle

> **LLMs reason. Tools verify. CI enforces.**

- **Reasoning (agents):** architecture, planning, code, root-cause analysis, security and performance
  reasoning, domain review, test strategy.
- **Verification (deterministic tools):** format, lint, typecheck, tests, builds, scans. The commands
  come from the project manifest and are never invented.
- **Enforcement (CI):** authoritative. The workflow is a pre-PR quality layer, not a CI replacement.

No agent may say a gate passed unless `sdlckit-eng gates` ran it and printed `GATES: PASS`.

## 2. How it runs in Claude Code

```
you ── /implement <change>
        │  main thread = orchestrator (subagents can't start subagents)
        │  1. classify the change (change-classifier)
        │  2. read the manifest (.claude/engineering.json)
        │  3. active domains = domains the diff touches ∩ domains present in the manifest
        │  4. choose specialists by risk (docs/routing.md)
        ├─▶ architect + domain specialists, in parallel → one plan → your approval
        ├─▶ the main thread writes the code
        ├─▶ sdlckit-eng gates (format, lint, typecheck, test …)
        ├─▶ reviewers on the real diff, in parallel → findings
        ├─▶ fix blockers and majors (at most 2 rounds, 3 for high risk)
        └─▶ pr-readiness → READY / NOT READY, PR description drafted
```

Specialists are read-only; the main thread makes every edit, so changes stay coherent and visible.
Context loads progressively: manifest → the relevant rulebook → the files that matter → the diff.

## 3. The project manifest

`/eng-init` writes `<repo>/.claude/engineering.json` (schema: `manifest.schema.json` in this folder)
after confirming it with you:

- `domains`: each with `present: true|false` and path globs. An absent domain's expert never fires.
- `gates`: the exact commands for `format`, `lint`, `typecheck`, `test`, `e2e`, `build` and others.
  `null` means "not available here", and nothing is invented in its place.
- `conventions`: free-form notes the specialists respect (validation library, state management…).
- `hooks`: optional project-scoped hooks that run gates automatically.
- `delivery`: settings for the delivery team, when the `sdlckit-team` plugin is installed.

## 4. Routing

`routing.md` in this folder is the single source of truth: which specialists fire for which change,
the risk rules that make an optional reviewer required, and workflow depth by change size. Small
changes skip the multi-agent review entirely.

## 5. Findings contract

Every reviewer returns the YAML in the `findings-contract` rulebook: severity (blocker, major, minor,
suggestion), confidence, file and line, problem and recommendation. Only blockers and majors gate the
workflow; suggestions never block.

## 6. Evidence and human authorization

Claims carry an evidence label: `verified`, `user-confirmed`, `inference`, `recommendation`,
`conflict`, `stale` or `tbd`. Infrastructure and production claims are `verified` or `tbd`, never
remembered as fact.

The workflow may analyze, plan, generate, validate and review. It never executes these without your
explicit authorization: `terraform apply`, a production deploy, a destructive migration, an IAM
escalation, a security-policy change, or a change to production data.

## 7. Knowledge loop and metrics

- `/eng-learn` turns a recurring human PR comment into a durable rule **in the project**: a lint
  rule, a test, a review rule in `.claude/engineering/rules.md`, or a line in the repo's `CLAUDE.md`,
  recorded in `.claude/engineering/lessons.md`.
- Each run appends counts to a per-project metrics store in the plugin's data folder
  (`sdlckit-eng metrics`): runs, findings, review rounds, false positives. Never prompt content.
- `/eng-report` summarizes them. The north-star is fewer valid human PR comments per change.

## 8. Non-goals

Not a CI/CD replacement; not a replacement for human architectural ownership; never runs every agent
for every change; no endless agent-to-agent debate; no expensive review of trivial changes; no gate
declared passed by an LLM; no autonomous production or infrastructure change.
