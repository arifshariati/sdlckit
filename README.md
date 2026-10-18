# sdlckit

Claude Code, engineered. An opinionated software delivery workflow for Claude Code, plus an AI
delivery team that takes a feature from your request to a reviewed, tested pull request.

> Status: pre-v1. Plugins validate with `claude plugin validate`; expect changes before 1.0.

## Install

One command, from any shell:

```bash
claude plugin marketplace add arifshariati/sdlckit && claude plugin install sdlckit-team@sdlckit
```

`sdlckit-team` depends on the other packs, so this installs the whole kit. To install only the
engineering workflow, use `claude plugin install sdlckit-workflow@sdlckit` instead.

Inside Claude Code the same steps are `/plugin marketplace add arifshariati/sdlckit` and
`/plugin install sdlckit-team@sdlckit`.

**Requirements:** Claude Code, Node.js 22 or later, and git. The bundled `sdlckit-eng` and
`sdlckit-delivery` commands are single self-contained files with no install step.

## Quick start

In a repository you want to work on:

1. `/sdlckit-workflow:eng-init` detects your stack, confirms the exact gate commands (format, lint,
   typecheck, test…) with you, and writes `.claude/engineering.json`. Say yes to the delivery team.
2. Then either:
   - **Make a change:** `/sdlckit-workflow:implement add rate limiting to the login endpoint`.
   - **Hand over a feature (or a list of them):** `/sdlckit-team:po saved payment methods`. The
     product owner interviews you, the team plans, designs, builds and tests it, and comes back to
     you at three gates: intake, plan, and acceptance.
3. `/sdlckit-team:board` shows where everything stands at any time.

You can also just ask ("add saved payment methods", "why is checkout slow?"): the routing skill
sends the request to the right workflow.

## What's included

| Plugin | What it gives you |
|---|---|
| `sdlckit-workflow` | `/implement`, `/fix`, `/investigate`, `/review`, `/pr-ready`, `/eng-init`, `/eng-learn`, `/eng-report`; reviewers for architecture, code, security, testing, performance and PR readiness; the `sdlckit-eng` gate runner |
| `sdlckit-backend` | NestJS, PostgreSQL and Supabase experts and rulebooks |
| `sdlckit-frontend` | React, React Native and Vite experts and rulebooks, plus `ui-craft`, the UI quality standard for Tailwind, shadcn and NativeWind |
| `sdlckit-infra` | AWS, Terraform and AI agent experts and rulebooks |
| `sdlckit-team` | The delivery team: product owner, business analyst, solution architect, tech lead, staff engineer, UI/UX designer, six domain engineers, QA, technical writer, DevOps and delivery manager; `/po`, `/refine`, `/deliver`, `/accept`, `/board`, `/team`; the `sdlckit-delivery` state machine |

Commands are plugin-scoped: type `/sdlckit-workflow:implement`, `/sdlckit-team:po`, and so on.
Experts only fire for domains your manifest marks present, so unused packs cost nothing.

## How it works

> **LLMs reason. Tools verify. CI enforces.**

- Agents plan, write and review. The project's own gate commands, run by `sdlckit-eng`, decide
  whether lint, typecheck and tests passed. No agent can declare a gate passed.
- The team's work is tracked as epics and tickets in `.delivery/` in your repo. Every state change
  goes through `sdlckit-delivery`, which refuses a move until its evidence exists: green gates and a
  clean review at the current commit, a QA verdict on the exact commit tested, acceptance tests
  QA has locked, docs, and the merge.
- You approve at three gates. Nothing is pushed until you accept an epic; then it becomes one PR.
- Model use is budgeted (`lean`, `balanced` or `max` per repo): the strongest model is spent where a
  mistake compounds, and work escalates only when it fails.

Read more in each plugin's `docs/`: `workflow.md` for the engineering workflow and `team.md` for
the delivery team.

## Uninstall

```bash
claude plugin uninstall sdlckit-team@sdlckit && claude plugin prune
```

`prune` removes the packs that were installed only as dependencies. Uninstalling a plugin also
removes its data folder (the workflow's metrics). Project files (`.claude/engineering.json`,
`.delivery/`) stay in your repositories until you delete them.

## Contributing

Content lives in `content/<pack>/`; `pnpm content:generate` builds `plugins/` and the marketplace,
and `pnpm gates` runs every check CI runs, including `claude plugin validate`. See
[docs/decisions.md](docs/decisions.md) for the design decisions behind the project.

## License

MIT. See [LICENSE](LICENSE).
