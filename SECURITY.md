# Security Policy

## Supported versions

sdlckit is pre-v1. Security fixes go to the latest release only.

| Version | Supported |
|---|---|
| 0.1.x | Yes |
| < 0.1.0 | No |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub's
[private vulnerability reporting](https://github.com/arifshariati/sdlckit/security/advisories/new).
Include:

- The plugin, command, script, or file affected
- Steps to reproduce, or a proof of concept
- The impact you expect, such as code execution, secret exposure, or unintended file writes
- The sdlckit and Claude Code versions you tested

You can expect an acknowledgment within 7 days. We will confirm the issue, work on a fix, and agree
on a disclosure date with you. Credit is given in the advisory unless you ask otherwise.

## Scope

In scope: the plugins and content in this repository, the `sdlckit-eng` and `sdlckit-delivery`
command-line tools, and the install and update flow.

Out of scope: vulnerabilities in Claude Code itself (report those to Anthropic), and in third-party
tools that a project's own gate commands invoke.
