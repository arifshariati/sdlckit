# sdlckit: design decisions

Decision log from the design interview. Each entry is final unless revisited here with a new entry.

1. **Distribution:** Claude Code plugin marketplace is the primary channel. `npx sdlckit` is the secondary channel.
2. **Language:** all executable code (CLI, hooks, validators, gate runner, cost guard) is TypeScript on Node 22 LTS. Skills, agents, and commands are Markdown.
3. **v1 scope:** the opinionated `sdlckit` SDLC workflow, the cost guard, and the installer CLI. Stack coverage: backend (Node, TypeScript, NestJS, Postgres), frontend (React, Vite, Tailwind), CI/CD (GitHub Actions), infrastructure (Terraform, AWS CDK).
4. **Name:** `sdlckit`. **License:** MIT.
5. **Contributions:** DCO sign-off (no CLA). CONTRIBUTING.md and Contributor Covenant 2.1. Single maintainer with CODEOWNERS. Triage within 7 days.
6. **Quality gates:** automated validators block merge. Evals are required only for items making measurable claims. Descriptive content needs no eval.
7. **Lifecycle:** every item carries `status` (current, superseded, deprecated), `verified` (date), and the Claude Code version it was verified against. A weekly drift job opens issues for upstream changes and for items unverified for 90 days. Nothing auto-merges.
8. **Privacy:** no telemetry in v1. The cost guard reads local transcript usage only and stores counts, never prompt or response content.
9. **Cost guard:** warn by default. Opt-in hard caps stop only at stage boundaries and write a resumable state file.
10. **Infrastructure bar:** HashiCorp Terraform and AWS CDK best practices. Zero findings in CI from tflint, Trivy config, Checkov, and cdk-nag. Suppressions are allowed only inline, with a written justification.
11. **Toolchain:** pnpm workspaces, Turborepo, tsup, Vitest, Biome (not ESLint), changesets.
12. **Versioning:** the workflow is one lockstep semver version. Standalone installable items carry their own `version` in frontmatter.
13. **Personalization:** the repo holds an opinionated public SDLC point of view. The author's private `~/.claude` setup stays out of the repo. Patterns are extracted, not files copied. A pre-publish denylist scan guards against leaked paths or names.
14. **Launch:** private until stable. Then LinkedIn, followed by Show HN, Reddit, and X, with a demo clip.

## Open topics

- CI/CD specifics (gate runner in GitHub Actions, composite actions)
- Marketplace manifest layout
- Hook runtime details
