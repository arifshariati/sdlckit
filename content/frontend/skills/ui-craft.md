---
name: ui-craft
description: "Use when building, restyling or polishing any user-facing UI in React, Tailwind and shadcn (web) or React Native and NativeWind (mobile), so it looks like a senior design team shipped it."
category: frontend
version: 0.1.0
status: current
verified: 2026-10-18
claudeCodeVersion: 2.1.302
---
# UI Craft

## Overview

This skill carries a **world-class UI/UX standard** and applies it automatically on every project. You do not need to specify the bar, dictate taste, or ask the user "what look do you want?" — the standard is known, and user-facing work is held to it by default. The only time to ask the user is a genuine product/content ambiguity, never "should this be good?"

Expert UI is distinguished by **restraint, intention, and craft** — not decoration. AI-generated UI gives itself away two ways: **sins of addition** (gradients, glows, colored shadows, hover-lifts, icon-chips, `rounded-xl shadow-lg` added to everything with no reason) and **shipping unseen** (writing JSX and never looking at the rendered pixels).

This skill kills both and holds the positive bar. It has two laws and one method.

**Law 1 — Hold the bar.** Every user-facing surface meets the standard in [standards.md](references/standards.md), regardless of what the surrounding project looks like. A low-quality codebase is not a license to ship low-quality UI — match its *conventions*, raise its *quality*.

**Law 2 — Never declare UI done without looking at it rendered.** See [visual-review.md](references/visual-review.md).

**The method:**
1. **Adapt conventions, not mediocrity.** In an existing project, match its *structural conventions* — design tokens, component library, spacing/radius scale, dark-mode wiring — so new work is consistent and drops in cleanly. But the project's current *quality* is never the ceiling: if its patterns fall below the standard, build to the standard and say what you raised. → [adapt-to-project.md](references/adapt-to-project.md)
2. **Derive for greenfield.** No design system yet? Derive one from product intent — don't reach for defaults (that's where violet gradients and emoji leak in). → [greenfield-direction.md](references/greenfield-direction.md)
3. **Build with restraint.** Every visual element must earn its place. → [craft-checklist.md](references/craft-checklist.md)
4. **Gate against AI tells** before finishing. → [ai-tells.md](references/ai-tells.md)
5. **Look at it.** Render, screenshot at mobile + desktop, critique real pixels, fix, re-render. → [visual-review.md](references/visual-review.md)

## When to use

- Building a new screen, page, component, modal, form, or layout
- Restyling or "making this look better / more professional / less AI"
- Any visual polish pass, empty/loading/error state, or responsive work
- Web: React + Tailwind + shadcn/Radix → [web-tailwind-shadcn.md](references/web-tailwind-shadcn.md)
- Mobile: React Native + NativeWind + reanimated → [react-native-nativewind.md](references/react-native-nativewind.md)

**Not for:** data-viz color/encoding (use the `dataviz` skill), standalone HTML artifacts (use `artifact-design`), or non-visual logic.

## The first move: look before you build

Before writing any code, in order:

1. **Is there a design system?** Grep for `tokens.css`/`theme`, `tailwind.config`, a `components/ui` or `@*/ui` package, existing screens. If yes → adopt its conventions (tokens, components, scale) so you stay consistent — but judge its quality against [standards.md](references/standards.md), not the other way around. If no → **derive** a direction first.
2. **Pick the platform reference** (web or RN) and read it.
3. **Build**, holding to the craft checklist.
4. **Gate + look.** Run the AI-tells gate, then render and critique. Iterate if the first render reveals problems.

## Project strategy, templates, and themes

For a project that needs a UI strategy document, reusable templates, or a theme control, read
[project-strategy.md](references/project-strategy.md). It covers the one-page strategy (direction,
token map, type, breakpoints, block map, state matrix, decisions log), templates as compositions,
and themes as tokens with a saved mode control.

## Delegate depth — don't reinvent

This skill owns *building* expert UI and a fast self-gate. For depth, invoke the specialists:

| Need | Invoke |
|------|--------|
| Full WCAG audit | `design:accessibility-review` |
| Structured design critique | `design:design-critique` |
| Dev handoff spec / tokens doc | `design:design-handoff` |
| Design-system audit/extend | `design:design-system` |
| Button/label/error wording | `design:ux-copy` |
| Charts & data color | `dataviz` |

## Restraint rules (the core of "not AI-generated")

Grounded in observed failures — these leak through even when the output is otherwise good:

- **No decoration without a reason.** A gradient, glow, colored shadow, border, or background tint must encode meaning (state, hierarchy, grouping) or it comes out.
- **Motion is specific and sparse.** Never `transition-all`. Name the property (`transition-colors`, `transition-transform`). Don't put a hover-lift or `scale-[1.02]` on every card — reserve motion for genuine affordances.
- **One accent, earned.** One brand hue + neutrals + at most one functional accent. Six competing colors is a tell.
- **Real content, not filler.** No lorem, no "Simple, transparent pricing" marketing-template copy. Write copy that fits the actual product, or delegate to `design:ux-copy`.
- **Spacing on a scale.** 4/8px rhythm. Eyeballed one-off paddings read as amateur.
- **Match the project's radius, shadow, and density** — don't import `rounded-xl shadow-lg` habits into a flat, sharp system.

## Red flags — STOP

If you catch yourself doing any of these, re-read [ai-tells.md](references/ai-tells.md):

- Adding a gradient/glow "to make it pop"
- `transition-all`, or a hover animation on every element
- Reaching for violet/indigo/purple by default on a blank project
- Emoji as icons or bullets
- Wrapping everything in a `Card`
- Centering everything
- About to say "done" without having rendered and looked at it
- Copy you'd never see in a real shipped product

**All of these mean: stop, cut the decoration or write real copy, then look at it rendered.**

## Rationalization table

| Excuse | Reality |
|--------|---------|
| "It's a small change, I don't need to render it" | Small changes shift layout and contrast. Look at it. |
| "The gradient makes it look modern" | Decoration without meaning is the #1 AI tell. Cut it. |
| "shadcn defaults are fine as-is" | Untouched defaults are the generated look. Adapt to the project or derive intent. |
| "I'll use placeholder copy for now" | Placeholder copy ships. Write real copy or delegate to ux-copy. |
| "Hover-lift on cards is standard" | Reflexive uniform motion is a tell. Reserve motion for real affordances. |
| "The existing code does it this way, so I'll match it" | Match *conventions* (tokens/components/scale). Do NOT inherit its *quality*. Hold the standard; raise what's below it and say so. |
| "The rest of this app looks like this" | A weak surrounding codebase is not the bar. standards.md is. Consistency of convention ≠ permission to ship mediocre UI. |
| "No running app, so I can't verify" | Fall back to the text gate in visual-review.md — but say you couldn't render. |
