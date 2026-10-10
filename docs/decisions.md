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
15. **CI/CD:** sdlckit's own CI runs its own gate runner (`packages/gate-runner`), and PRs can't merge without it. The same runner ships to users through the CI/CD pack. CI is one reusable workflow (`workflow_call`) plus one composite setup action. The logic lives in TypeScript, not in YAML. Scanner versions are pinned in one file.
16. **Marketplace layout:** six plugins, one per pack: `sdlckit-workflow`, `sdlckit-cost`, `sdlckit-backend`, `sdlckit-frontend`, `sdlckit-cicd`, `sdlckit-infra`. `content/<pack>/` is the source. A TypeScript build generates `plugins/` and `.claude-plugin/marketplace.json`. Generated output is committed, and CI fails if it drifts from a fresh build. Cross-pack dependencies are declared in each plugin manifest.
17. **Hook runtime:** each hook is bundled by tsup into one self-contained `.js` file, with no install step for users. Hooks run on Node 22, which the CLI checks at install time. Hooks are fail-open: a crash, timeout, or parse error is logged to a file and the session continues. The only blocking behavior is a user-enabled budget cap at a stage boundary. Every hook has a short hard timeout. Stdout is reserved for the protocol response, and logs go to a file.
18. **Verification of upstream formats:** the plugin manifest schema is checked against the official Claude Code docs before the generator is written, because that format is the most likely to change.
19. **Content layout (refines 16):** the source is `content/<pack>/<type>/<name>.md`, where `<pack>` is one of the six packs and `<type>` is `skills`, `agents`, `commands`, `hooks`, or `rulebooks`. The pack folder is the source of truth, and the frontmatter `category` must match it. Each pack that exists has a `content/<pack>/pack.json` with its lockstep `version`, `description`, and optional `dependencies`.
20. **Generator mapping:** skills and rulebooks compile to `skills/<name>/SKILL.md`, because Claude Code requires that folder shape. Agents and commands compile to flat `.md` files. Generated frontmatter keeps only `name` and `description`, and the lifecycle fields stay in the source. Hooks are not generated yet, and the generator refuses them rather than skipping them silently.
21. **Verification before publish:** the generator's output must pass `claude plugin validate` for the marketplace and for each plugin. This was verified on a sample pack. Install-time checks are not part of CI, because installing writes to a user's settings.

22. **Gates and CI (implements 15):** `packages/gate-runner` runs every gate in order and reports the real output of each failure. It never stops at the first failure. Gates: lint, typecheck, build, test, content validation, the generated-output drift check, and `claude plugin validate` for the marketplace and each plugin. `.github/workflows/gates.yml` is a reusable workflow, and `.github/actions/setup` is the composite setup action. It pins Node from `.nvmrc`, pnpm from `packageManager`, and the Claude Code CLI to one version (2.1.296). Infrastructure scanners (decision 10) join the gates when infrastructure content lands.

## Open topics

None. The design interview is complete. Remaining work is implementation, starting with the validators.
