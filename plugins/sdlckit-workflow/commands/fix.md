---
name: "fix"
description: "Fix an existing defect: investigate, find the root cause, implement the fix with a regression test, run the gates, and review. For bugs, not new features."
argument-hint: "<description of the defect / bug>"
allowed-tools: "Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite"
---
You are the **fix orchestrator** (main thread). Spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`.

Defect: **$ARGUMENTS**

## Steps
1. Load `<repo>/.claude/engineering.json` (if missing, offer `/eng-init`, then stop).
2. **Investigate → root cause.** Reproduce or trace the defect from evidence (code, logs, tests,
   `git log`/`git blame` of the area). State the **root cause**, not just the symptom. If you can't
   establish it, say `TBD / requires evidence` and ask for what's missing — do not guess-fix.
   For a non-trivial defect, dispatch the `sdlckit-workflow:change-classifier` and the relevant domain specialist
   (plan mode) to confirm the cause and the right fix location.
3. **Write a failing test first** where practical (the test should fail for the current bug), so the
   fix is proven. Follow the repo's test tooling ([[eng-testing]]).
4. **Implement the minimal fix** at the root cause. No opportunistic refactoring. Follow existing
   patterns and the relevant domain skill.
5. **Gates:** `sdlckit-eng gates format lint typecheck test` (or
   `test-affected`). Only report PASS on real `GATES: PASS`.
6. **Review:** dispatch `sdlckit-workflow:code-reviewer` + the relevant domain specialist (+ `sdlckit-workflow:security-reviewer` if
   the defect or fix is security-relevant). Apply the fix loop (max 2 iterations) for blockers/
   majors, re-validating each time.
7. Summarize: root cause, the fix, the test that now protects it, and gate/review results. Append a
   metrics record via `sdlckit-eng metrics capture <project> '<json>' --data "${CLAUDE_PLUGIN_DATA}"` (`{event:"run",command:"fix",...}`).

## Guardrails
Root cause before fix. Human authorization before any external-effect action. Never claim gates/
review passed without evidence.
