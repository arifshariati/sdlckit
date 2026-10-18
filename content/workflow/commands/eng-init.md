---
name: eng-init
description: "Set up sdlckit for this repo: detect the stack, confirm the exact gate commands and domains with you, write the project manifest, and optionally enable the delivery team."
category: workflow
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
argument-hint: "[--with-hooks]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---
You are bootstrapping the **sdlckit workflow** (spec: `${CLAUDE_PLUGIN_ROOT}/docs/workflow.md`,
manifest schema: `${CLAUDE_PLUGIN_ROOT}/docs/manifest.schema.json`) for the current repository.

## Steps

1. **Detect.** Run the discovery helper and read its JSON:
   ```
   sdlckit-eng detect "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
   ```
   Then verify/augment by actually looking: root `package.json` scripts, `turbo.json`/
   `nx.json`/`pnpm-workspace.yaml`, workspace layout (`apps/*`, `packages/*`), `supabase/`,
   `*.tf`, migration dirs. **Discover, do not invent.** If the helper is unsure about a gate
   (e.g. e2e target in a monorepo), resolve it by reading the relevant workspace `package.json`.

2. **Resolve exact gate commands.** For `format`, `lint`, `typecheck`, `test`, `test-affected`,
   `e2e`, `a11y`, `build`, `coverage`, `iac-validate`: use the real script with its runner prefix
   (e.g. `pnpm type-check`). If a gate genuinely does not exist, set it to `null` — never guess a
   command that isn't there. For monorepos prefer affected/filtered runs for `test-affected`.

3. **Resolve active domains.** Mark `present:true` only where real code/config exists, with the
   `paths` globs that scope them. Everything absent is `present:false` (its specialist will never
   fire here). Capture obvious `conventions` you can see (validation libs, state mgmt, migration
   tool).

4. **Confirm with the user.** Present a concise table: package manager, monorepo tool, present
   domains, and the resolved gate commands. Ask the user to confirm or correct **before writing**.
   Do not skip this — a wrong gate command silently corrupts every later run.

5. **Write the manifest** to `<repo>/.claude/engineering.json`, conforming to the schema. Pretty-
   print, 2-space indent, then format it with the repo's own formatter if it covers JSON (e.g. the
   `format` gate in write mode, `biome format --write`, `prettier --write`) so `lint`/`format` stay green. Include `version:1`, `project` (repo dir name), `generatedAt` (today).

6. **Hooks (only if `--with-hooks` or the user asks).** Set `hooks.autoGateOnStop:true` in the
   manifest and add a **project-scoped** hook to `<repo>/.claude/settings.json` (create/merge,
   never touch the user's own settings) that runs
   `sdlckit-eng gates lint typecheck` on `Stop`. Explain that this
   fires gates automatically only in this repo.

7. **Delivery team step (only if the `sdlckit-team` plugin is installed, i.e. `sdlckit-delivery` is on PATH).** Ask once: "Enable the delivery team (PO → refine → design → build →
   QA → done) in this repo?" (recommended: yes). If yes:
   - Resolve `delivery` settings (schema: manifest `delivery` section; spec:
     the team plugin's `docs/team.md`): `budget` (default `balanced`), `maxParallelEngineers` (2),
     `baseBranch` (the repo's real default branch: `git symbolic-ref refs/remotes/origin/HEAD` or
     `main`), `gates` (the per-ticket gate list — only gates that are non-null above; prefer
     `test-affected` over `test` in large monorepos), `worktreeSetup` (the install command, e.g.
     `pnpm install --frozen-lockfile`), `worktreeCopy` (untracked local env files the gates need,
     e.g. `.env`, `apps/api/.env` — list paths only, never read or print their contents),
     `designSystem` (`{web:"shadcn", mobile:"react-native-reusables"}`).
   - Include these in the confirmation table of step 4 (or confirm them now if the manifest
     already existed), then write them into the manifest.
   - Run `sdlckit-delivery init` — scaffolds `.delivery/` and adds the
     scratch block to `.gitignore`. `.delivery/` itself is committed (it holds the Done docs).
   - If the web app is not on shadcn/ui, note it: the designer will propose a migration ticket on
     the first UI epic (decision: always shadcn).

8. **Report.** Show the written manifest path and a one-line summary. Remind the user the fleet is
   now active here and that `/implement`, `/review`, `/pr-ready` will use these exact commands —
   and, if delivery was enabled, that `/po <idea or feature list>` starts the team.

## Guardrails
- Validate the final JSON parses (`node -e "require('<path>')"`).
- Never write secrets. Never modify the user's own (user-level) Claude Code settings.
- If a manifest already exists, read it, show a diff of proposed changes, and confirm before
  overwriting.
