# Contributing to sdlckit

Thanks for wanting to improve sdlckit. This guide covers how to set up, what we check, and how to
get a change merged.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- For a bug, open an issue with the steps to reproduce, the Claude Code version, and the plugin
  and command involved.
- For a new feature or a change in behavior, open an issue first so we can agree on the approach.
  This keeps you from building something that won't be merged.
- For a security problem, do not open a public issue. See [SECURITY.md](SECURITY.md).

## Set up

You need Node.js 22 or later and pnpm (the version is pinned in `package.json`).

```bash
git clone git@github.com:arifshariati/sdlckit.git
cd sdlckit
pnpm install
pnpm build
pnpm gates
```

`pnpm gates` runs every check CI runs: format, lint, typecheck, tests, the content validators, and
`claude plugin validate`. A change is ready when it passes locally.

## Where things live

- `content/<pack>/` is the source of truth for every skill, agent, command and rulebook.
- `plugins/` and `.claude-plugin/marketplace.json` are **generated**. Do not edit them by hand.
  Run `pnpm content:generate` after changing `content/`. CI fails if the generated output is out of
  date.
- `packages/` holds the TypeScript tools: the gate runner (`eng`), the delivery state machine
  (`delivery`), the generator, and the validators.
- `docs/decisions.md` is the design decision log. If your change alters a design decision, add an
  entry rather than rewriting an old one.

## Commits and sign-off

- Use [Conventional Commits](https://www.conventionalcommits.org/) for the subject line, for example
  `feat(team): add a QA rework limit` or `fix(gates): handle a missing lint script`.
- Sign off every commit under the [Developer Certificate of Origin](https://developercertificate.org/)
  with `git commit -s`. This adds a `Signed-off-by:` line to the message. We do not use a CLA.

```bash
git commit -s -m "fix(gates): handle a missing lint script"
```

## Pull requests

1. Branch from `main`.
2. Make the change, with tests where behavior changes. Regenerate `plugins/` if you touched `content/`.
3. Run `pnpm gates` and confirm it passes.
4. Open a pull request and fill in the template. Keep it focused: one logical change per PR.
5. A maintainer reviews within 7 days. The CI check (`Gates`) must pass before merge.

## Review

Maintainers review every change. Reviews focus on correctness, the clarity of the content for
Claude Code users, and whether a change fits the project's design decisions. Nothing merges without
review, and no one, including the maintainer, merges a change with a failing gate.

## Licensing

sdlckit is released under the [MIT License](LICENSE). By contributing, you agree that your
contribution is licensed under the same terms.
