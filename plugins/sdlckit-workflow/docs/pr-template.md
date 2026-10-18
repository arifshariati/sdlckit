# PR description template

Single source of truth for PR descriptions written by the sdlckit workflow (any repo).
**If the repo has its own `.github/pull_request_template.md`, use that instead** and fold the
diagram rule below into its closest section.

Follow the user's own preferences for attribution lines; this template adds none.

## Template

```markdown
## Summary
<1–3 sentences: what changed and the user-visible/system effect.>

## Why
<Problem, motivation, or linked issue. Not a restatement of the diff.>

## Changes
- <Grouped by area/module; the notable decisions, not every file.>

## Diagram
<Mermaid diagram if the rule below applies, otherwise: N/A — <one-line reason>.>

## Testing
<Real gate output summary (format/lint/typecheck/test) + manual verification.
Never claim a gate passed without actual output from `sdlckit-eng gates`.>

## Risks & rollout
<Migrations, env vars, feature flags, backwards compatibility, rollback plan, operator follow-ups.
"None" if genuinely none.>
```

## When a diagram is required

Include one when the change:
- adds or alters a multi-step flow (auth, billing, invites, webhooks, jobs/queues);
- changes how modules/services/apps interact (API ↔ web ↔ mobile ↔ DB ↔ third party);
- changes the data model or relationships (migrations, new tables, RLS/permission boundaries);
- introduces or changes a state machine or lifecycle.

Skip it (write `N/A — <reason>`) for typo/copy fixes, dependency bumps, pure refactors with no
behavior change, config tweaks, and small isolated bug fixes.

## Diagram conventions
- Mermaid in a fenced ```` ```mermaid ```` block (renders natively on GitHub).
- Pick the type that fits: `sequenceDiagram` (request/flow across actors), `flowchart` (logic or
  architecture), `erDiagram` (schema), `stateDiagram-v2` (lifecycles).
- Show the **changed** parts; mark new/changed nodes (e.g. label "(new)") so reviewers see the delta.
- Keep it small enough to read at a glance (≈ ≤ 12 nodes); split into two diagrams rather than one sprawling one.

### Mermaid syntax rules (hard requirements — broken diagrams have shipped before)
1. **Double-quote every node label**, always: `A["Page: /dashboard/sos"]`, never `A[Page: /dashboard/sos]`.
   Unquoted labels starting with `/`, `\`, `(`, `[`, `{`, `>` silently become other shapes
   (`[/x]` is a parallelogram) and unquoted `:`, `(`, `)`, `"`, `'`, `|`, `;` can break parsing.
2. Double-quote edge labels too: `A -->|"logged"| B`. Use `[("name")]` for DB cylinders.
3. In `sequenceDiagram`, avoid `;` and `#` in message text; in `erDiagram`, attribute names are bare words.
4. Node IDs are plain alphanumerics (`DB`, `L2`), never reserved words (`end`, `graph`, `subgraph`).
5. **Validate before you post.** Write the PR body to a file, then run
   `sdlckit-eng mermaid <body.md>` and require every block to
   print `✓ ... parses`. Do this before `gh pr create` **and** before every `gh pr edit`. If it
   fails, fix the diagram — never open or update the PR with an unvalidated or failing diagram.

