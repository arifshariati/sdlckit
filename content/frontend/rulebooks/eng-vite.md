---
name: eng-vite
description: "Vite rulebook: bundle size, code splitting, environment handling, dependency pre-bundling, build config and source maps. Load when touching Vite config or the web bundle."
category: frontend
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# Vite / build rules

## Env & secrets
- Only `VITE_`-prefixed vars reach the client bundle — and everything that reaches it is **public**.
  Never put secrets, service keys, or server-only config in `VITE_` vars. Flag any secret-looking
  value exposed to the client as a blocker.

## Bundle & splitting
- Watch bundle growth: lazy-load routes/heavy components (`React.lazy` + `Suspense`), split vendor
  chunks sensibly. Don't import a whole library for one function; prefer deep/tree-shakeable imports.
- Avoid pulling Node-only or server-only modules into client code. Keep polyfills intentional.

## Config
- Keep `vite.config` changes minimal and justified; don't disable optimizations or source maps
  without reason. Align `tsconfig`/path aliases with the config so resolution matches runtime.
- Respect existing plugin setup (`@vitejs/plugin-react`, `@tailwindcss/vite`). Don't add plugins
  that duplicate existing behavior.

## Perf signals to flag
Large/growing main chunk · eager import of heavy deps · missing route-level splitting · barrel
files defeating tree-shaking · dev-only code shipped to prod.

Emit the YAML findings contract (the `findings-contract` rulebook).
