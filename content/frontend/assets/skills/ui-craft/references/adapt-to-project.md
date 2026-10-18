# Adapt to the project

The primary mode. New UI must look like the best engineer on *this* team wrote it. Before building, detect the design language and match it exactly. Mismatched radius, off-scale spacing, or a stray gradient is what makes new code look bolted-on and "generated."

## Detection checklist — run first

Spend 2 minutes reading before writing. Look for, in order:

1. **Design tokens / theme**
   - `grep -rl "oklch\|hsl(\|--primary\|--background" **/*.css` and any `tokens.css`, `theme.css`, `globals.css`, `@theme`
   - A `@*/theme` or `@*/ui` workspace package
   - `tailwind.config.*` `theme.extend` (colors, spacing, borderRadius, fontFamily)
   - CSS variables → **use the semantic tokens, never hardcoded hex/oklch**

2. **Component library**
   - `components/ui/`, a shadcn setup (`components.json`), a `@*/ui` package, Radix, Chakra, MUI, Mantine, etc.
   - **Reuse existing components.** Don't build a new `Button` next to the team's `Button`.
   - Match the existing component API shape (variant props, `cn()` usage, `cva` patterns).

3. **Spacing & sizing rhythm** — scan a few existing screens: is it `space-y-4/6/8`? `gap-6`? What container width (`max-w-6xl`)? Match it.

4. **Radius & elevation** — is the app sharp (`rounded-none/sm`) or soft (`rounded-lg/xl`)? Flat or shadowed? One `--radius` driving a scale? Match it; do not import your own `rounded-xl shadow-lg` defaults.

5. **Typography** — font families (check `@fontsource`, `next/font`, `tailwind fontFamily`), the size scale in use, heading treatment (`tracking-tight`? `font-semibold` vs `bold`?). Match the scale.

6. **Density** — compact or airy? Match the existing information density.

7. **Motion** — does the app animate? With what (`tw-animate-css`, framer-motion, reanimated)? At what durations? Match or stay still — don't introduce a new motion vocabulary.

8. **Icons** — which set (lucide, heroicons, custom SVG)? Use the same one. Don't add a new icon dependency; if none exists, inline minimal SVGs rather than pulling a library.

9. **Dark mode** — if the app supports it (`.dark`, `prefers-color-scheme`, a theme provider), everything new must work in both. Semantic tokens give this for free; hardcoded colors break it.

## The rule — match conventions, hold the bar

> Match the project's **conventions** so your work is consistent and drops in cleanly: its tokens, component library, spacing/radius scale, dark-mode wiring, icon set, motion vocabulary. On these, you don't get a separate opinion — consistency *is* the quality.
>
> But the project's **quality** is a separate axis. Conventions ≠ excellence. A codebase can use consistent tokens and still have weak hierarchy, missing states, poor contrast, or AI tells. Never treat the existing quality as the ceiling. Hold the bar in [standards.md](standards.md): build to the standard, and when you must diverge from a bad existing pattern to meet it, do so and say briefly what you raised and why.

**Distinguish the two:**

| Match it (consistency) | Hold the bar (quality) |
|---|---|
| Which token/component/scale/radius/font/icon set | Whether hierarchy is clear |
| Dark-mode mechanism, motion library | Whether all four states exist |
| Naming, file structure, API shape | Contrast, focus, keyboard access |
| Container widths, density | Whether copy is real and helpful |

When a project is genuinely silent on a convention, derive it in the project's spirit (see [greenfield-direction.md](greenfield-direction.md)) — never from your defaults.

## When the project is partially defined

Common case: tokens + a component lib exist, but no pattern for the specific thing you're building (e.g. no existing "stat card"). Then:
- Compose from existing primitives and tokens.
- Infer the missing decision from adjacent patterns (how do *other* cards in this app look?).
- Only fall to [greenfield-direction.md](greenfield-direction.md) for the genuinely-unspecified sub-decision, and keep it consistent with everything around it.

## Anti-patterns

- Building a parallel style system next to the existing one
- Hardcoding colors when semantic tokens exist
- Introducing a new font, icon set, radius, or motion library "because it's nicer"
- Ignoring dark mode in a dark-mode app
- Copying a pattern from a tutorial instead of from the codebase
