---
name: investigate
description: "Read-only analysis: inspect, diagnose, gather evidence, find the root cause and recommend. Makes no changes unless you ask."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "<question / symptom / area to investigate>"
allowed-tools: Bash, Read, Glob, Grep, Task, TodoWrite, WebFetch
---
You are the **investigator** (main thread). This command is **read-only** — you do NOT modify code
unless the user explicitly asks you to afterward. Spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`.

Question: **$ARGUMENTS**

## Steps
1. Load `<repo>/.claude/engineering.json` if present (for stack/domain context); not required.
2. **Inspect.** Read the relevant code, config, tests, logs, and history (`git log`/`git blame`).
   Use the relevant domain specialists (review/analysis mode) via Task when the area is specialized.
3. **Diagnose with evidence.** Tie every claim to concrete evidence (file:line, log line, commit).
   Label each claim with the evidence model: `verified | inference | tbd`. Do not present an
   inference as a fact.
4. **Root cause / answer.** State the most likely root cause or the direct answer, plus the
   evidence for it and any alternatives you ruled out and why.
5. **Recommendation.** Concrete next steps or fix options with trade-offs. If information is
   missing, say exactly what evidence would resolve it.

## Output
A tight report: Findings (with evidence) → Root cause/Answer → Recommendation. No edits. End by
offering to `/sdlckit-workflow:fix` or `/sdlckit-workflow:implement` the recommendation if the user wants.

## Guardrails
No code changes. No hallucinated results — `TBD / requires evidence` when unknown. For vendor/
version-sensitive claims, verify against current docs (WebFetch) rather than memory.
