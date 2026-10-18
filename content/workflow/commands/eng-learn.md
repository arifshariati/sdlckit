---
name: eng-learn
description: "Turn a recurring PR comment or lesson into a durable rule in this project, recorded in its lessons catalog, so the workflow catches it next time."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "<the recurring comment / lesson, in quotes>"
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---
You are running the **engineering knowledge loop** for this project. Spec:
`${CLAUDE_PLUGIN_ROOT}/docs/workflow.md` (knowledge loop).

Lesson: **$ARGUMENTS**

Everything you write stays **in this project**. Never edit the installed plugin's files (an update
replaces them) or the user's own user-level files.

## Steps
1. **Classify** the lesson: which domain or category (architecture, security, performance, testing,
   react, nestjs, supabase, postgres, monorepo, vite, aws, terraform, ai)?
2. **Choose the encoding**, the most durable mechanism that fits:
   - a **lint or static rule** (best, because it is deterministic): add it to the repo's linter config;
   - a **test**: add the test, or name exactly what to test;
   - a **review rule**: add it to `<repo>/.claude/engineering/rules.md` under the domain heading, so
     reviewers read it with the manifest `conventions` (create the file if needed);
   - a **project-wide instruction** (rare): add one line to the repo's `CLAUDE.md`.
   Prefer a deterministic check over a review rule whenever one is possible.
3. **Apply the edit.** Keep it concise and concrete, specific enough that a reviewer can act on it.
4. **Record it** in `<repo>/.claude/engineering/lessons.md` (create it with a `# Lessons` heading if
   missing): next `L-NNN`, then Observed, Category, Encoded as, Where, Date.
5. **Log a metric** so `/sdlckit-workflow:eng-report` tracks the north-star:
   ```
   sdlckit-eng metrics capture "<project>" \
     '{"event":"finding","severity":"<sev>","category":"<cat>","source":"human_pr","auto_fixed":false}' \
     --data "${CLAUDE_PLUGIN_DATA}"
   ```
6. **Report** the lesson, where it is now encoded, and how it will be caught next time. If the lesson
   belongs in sdlckit's own rulebooks for everyone, say so and suggest opening an issue upstream.

## Guardrails
A lesson that isn't wired into a check, a test or a rule the reviewers read is only a note. Keep edits
small and reversible.
