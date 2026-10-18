---
name: eng-react
description: "React web rulebook: components, hooks, state, rendering, data fetching, forms, accessibility and Tailwind or shadcn conventions. Tuned for React 19, Vite and Tailwind."
category: frontend
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# React (web) rules

Prefer the repo's existing patterns (check the manifest `conventions`, `the shared UI package`, `the theme package`).

## Components & structure
- Keep business logic out of presentation components. Extract to hooks or plain functions.
- Small, single-responsibility components. Reuse existing components before creating new ones.
- Co-locate component, its hook, and its test.

## State
- Local state first; lift only when genuinely shared. Reach for global state (store/context) only
  for truly cross-cutting state — not to avoid passing a prop two levels.
- Derive, don't store: compute derived values during render, not in `useEffect` + state.
- Server state is not UI state — use the data-fetching layer's cache, don't mirror it into state.

## Hooks & effects
- Effects are for synchronizing with external systems, not for deriving data or reacting to props.
- Every effect: correct dependency array, and a cleanup for subscriptions/timers/aborts.
- No premature `useMemo`/`useCallback` — add only with a measured render problem or a stable-identity
  requirement.

## Rendering & data
- Guard against duplicate/racing requests; abort stale ones. Handle loading AND error AND empty
  states explicitly — never a bare spinner that can hang forever.
- Keys must be stable + unique (not array index for reorderable lists).
- Avoid unnecessary re-renders from new object/array/function identities passed to memoized children.

## Forms & validation
- Validate with the repo's chosen tool (zod/react-hook-form if present). Validate at the boundary;
  type the parsed result. Don't trust client validation for security — the server re-validates.

## Typing
- Strong types; no `any`. Type props, API responses (parse, don't cast), and event handlers.

## Accessibility (the repo uses @axe-core/playwright — a11y is tested)
- Semantic elements, labels for inputs, focus management for dialogs/menus, keyboard operability,
  visible focus, sufficient contrast. Don't regress what axe checks.

## Styling
- Follow existing Tailwind/theme conventions and shared `the shared UI package` components. Don't introduce a
  parallel styling system. Respect design tokens / `the theme package`.

## Avoid
Unnecessary global state · prop drilling where a hook/context fits · effects for derived state ·
premature memoization · duplicate API calls · uncontrolled async · weak typing · logic in
presentation components.

Emit the YAML findings contract (the `findings-contract` rulebook).
