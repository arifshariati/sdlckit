---
name: eng-report
description: "Summarize this project's engineering metrics: runs, findings by severity and category, auto-fix rate, review rounds, false positives, and the human PR comment trend."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "[since YYYY-MM-DD]"
allowed-tools: Bash, Read
---
You are producing the **engineering metrics report**. Spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`
(knowledge loop and metrics).

1. Determine the project name from `<repo>/.claude/engineering.json` (`project`), or the repo folder.
2. Run:
   ```
   sdlckit-eng metrics report "<project>" $ARGUMENTS --data "${CLAUDE_PLUGIN_DATA}"
   ```
   (`$ARGUMENTS` is optional, for example a since-date such as `2026-10-01`.)
3. Present the output, then add a short interpretation:
   - what is trending (finding categories, review rounds, false-positive rate);
   - the **north-star**: are valid human PR comments per change going down? If PR-comment data is
     sparse, say so and suggest logging recurring comments with `/sdlckit-workflow:eng-learn`;
   - one to three concrete suggestions (for example "N+1 findings recur: encode a review rule with
     `/sdlckit-workflow:eng-learn`").

This is read-only. Metrics are counts only, never prompt or response content. If there are none yet,
say so and point to the commands that create them.
