# Web — React + TypeScript + Tailwind + shadcn/Radix

Stack-specific patterns for building expert web UI. Assumes React 19, Tailwind v4, shadcn-style components over Radix primitives.

## Tailwind v4 essentials (differs from v3)

- **CSS-first config.** No `tailwind.config.js` for theme — tokens live in CSS under `@theme` / `@theme inline`. Import with `@import "tailwindcss";`.
- **Semantic color tokens** are wired by mapping CSS vars into `@theme inline`:
  ```css
  @theme inline {
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --radius-lg: var(--radius);
  }
  :root { --primary: oklch(0.56 0.18 255); --primary-foreground: oklch(0.99 0 0); }
  .dark { --primary: oklch(0.72 0.16 255); }
  ```
  Then `bg-primary text-primary-foreground` just works, in light and dark.
- **Dark mode:** `@custom-variant dark (&:is(.dark *));` + a `.dark` class on `<html>`. Use tokens; never hardcode.
- `text-balance` / `text-pretty`, container queries (`@container`), and `size-*` are available — use them.

## Component discipline

- **Use the project's `ui` library.** shadcn components are copied into the repo — read and reuse them; don't re-import a competing lib.
- **`cn()` for class merging** (clsx + tailwind-merge). Compose; don't string-concat.
- **`cva` for variants.** Follow the existing variant/size API when extending.
- **Radix for behavior.** Use Radix primitives (Dialog, Popover, Select, Tooltip, DropdownMenu…) for accessible interaction instead of hand-rolling. They give focus trap, keyboard nav, ARIA for free.
- **`asChild`** to compose without extra DOM.
- **lucide-react** for icons if the project uses it; otherwise inline minimal SVG rather than adding a dependency.

## Patterns that read as expert

- **Composition over props-explosion.** Prefer `<Card><CardHeader/>…</Card>` slots to one component with 20 props.
- **Variants via `cva`**, not conditional class soup.
- **Controlled where it matters**, uncontrolled where it's simpler (Radix supports both).
- **Forms:** real labels (`<Label htmlFor>`), inline validation, `aria-invalid`, `aria-describedby` for errors. Consider the project's form lib (react-hook-form) if present.
- **Toasts:** use the project's (e.g. `sonner`) — don't build a parallel notification system.
- **Loading:** `Skeleton` components shaped like the content; Suspense boundaries where applicable.

## Common web tells to avoid (see ai-tells.md)

- `bg-gradient-to-r ... bg-clip-text text-transparent` headings
- `backdrop-blur` + translucent card as default decoration
- A blurred radial "glow" div behind the hero
- `transition-all duration-300` on everything
- `hover:scale-105` / `hover:-translate-y-1` on every card
- `shadow-2xl` / colored shadows as default
- `rounded-2xl` on every element regardless of system

## A11y + verification hooks

- Keyboard: every interaction operable; `focus-visible` rings on tokens (`ring-ring`).
- If the project has `@axe-core/playwright`, run it (or delegate to `design:accessibility-review`).
- See [visual-review.md](visual-review.md) to render + screenshot via Playwright before finishing.

## Minimal expert example — a stat tile (no tells)

```tsx
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string;      // pre-formatted; use tabular-nums
  hint?: string;
  className?: string;
}

// No gradient, no glow, no hover-lift, no colored shadow, no icon-chip.
// Hierarchy from type scale + token colors. Border for separation, not shadow.
export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-5", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
```
