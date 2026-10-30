# Changelog

All notable changes to sdlckit are recorded here. The project follows [Semantic Versioning](https://semver.org/).
While the major version is `0`, minor versions may include breaking changes.

## [Unreleased]

### Changed

- **All packs:** every agent runs on `haiku`. Model tiers (`opus`, `sonnet`) and the per-repo `budget` setting (`lean`, `balanced`, `max`) are removed. Each agent sets an `effort` level instead (`low` to `xhigh`), chosen by how much judgment its role carries.
- **sdlckit-team:** `sdlckit-delivery model` returns `model` and `effort`. Rework escalation raises effort (never the model), and escalations are recorded in `effort_overrides`. The ticket template uses `effort_overrides`.
- **sdlckit-workflow:** `eng-init` no longer writes a `budget` setting, and the manifest schema drops `delivery.budget`.

## [0.1.0] - 2026-10-18

First public release. sdlckit is pre-v1: expect changes before 1.0.

### Added

- **sdlckit-workflow:** the engineering workflow (`/implement`, `/fix`, `/investigate`, `/review`,
  `/pr-ready`, `/eng-init`, `/eng-learn`, `/eng-report`), with reviewers for architecture, code,
  security, testing, performance and PR readiness.
- **sdlckit-eng:** a self-contained gate runner that runs the project's own format, lint, typecheck
  and test commands. Agents cannot declare a gate passed.
- **sdlckit-backend:** NestJS, PostgreSQL and Supabase experts and rulebooks.
- **sdlckit-frontend:** React, React Native and Vite experts and rulebooks, plus `ui-craft`, the UI
  quality standard for Tailwind, shadcn and NativeWind.
- **sdlckit-infra:** AWS, Terraform and AI agent experts and rulebooks. Dormant in repos without
  those domains.
- **sdlckit-team:** the AI delivery team (product owner, solution architect, tech lead, staff
  engineer, UI/UX designer, domain engineers, QA, technical writer, DevOps and delivery manager),
  with the `/po`, `/refine`, `/deliver`, `/accept`, `/board` and `/team` commands.
- **sdlckit-delivery:** a state machine for `.delivery/` records. It refuses a state change until its
  evidence exists: green gates, a clean review, a QA verdict on the tested commit, locked acceptance
  tests, docs, and the merge.
- Plugin marketplace at `arifshariati/sdlckit`, installable with
  `claude plugin marketplace add arifshariati/sdlckit`.
- Design decision log in [docs/decisions.md](docs/decisions.md).

[0.1.0]: https://github.com/arifshariati/sdlckit/releases/tag/v0.1.0
