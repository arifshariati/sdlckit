# Greenfield direction

No design system exists yet. This is where AI defaults leak in (violet gradients, emoji, generic shadcn). The fix: **derive a design direction from product intent before building**, the way a design team starts from a brief — not from a template. Run this method once, write the tokens down, then build against them.

A single reused theme becomes its own recognizable tell. Derive fresh each time from the actual product.

## Step 1 — Name the product personality

In one line, pick 2–3 adjectives from the product's actual purpose and audience. Examples:
- A quit-smoking app → *calm, encouraging, trustworthy*
- A trading terminal → *dense, precise, high-contrast*
- A kids' learning app → *playful, warm, friendly*
- A legal SaaS → *authoritative, restrained, serious*

Personality drives every later choice. Write it down.

## Step 2 — Derive the palette (OKLCH, restrained)

Use OKLCH for perceptually even lightness and easy contrast control. Build the minimum:

- **One brand hue.** Choose the hue angle from personality, NOT the default violet. Rough guide: red ~15–30, orange ~45–70, green ~145–165, teal ~180–195, blue ~230–260, purple ~290–310. Calm/health → green/teal/blue. Energetic → orange/red. Premium → deep blue or near-neutral.
- **A neutral ramp** — grays carrying a faint cast of the brand hue (chroma ≤ 0.02) so neutrals feel intentional, not stock.
- **Functional colors** — `destructive` (red ~27), `success` (green ~155), `warning` (amber ~70), `info` (blue ~245). Only include the ones you use.
- **At most one extra accent.** Usually you don't need it.

Define semantic tokens, each with a `-foreground` pair, and **verify contrast ≥ 4.5:1** for every text/background pair (large text ≥ 3:1). Provide light and dark values.

Reference-grade token shape (adapt the hue/values; this is the structure to produce):

```css
:root {
  --radius: 0.625rem;            /* one knob drives the radius scale */
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0.01 <hue>);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.01 <hue>);
  --primary: oklch(0.56 0.18 <hue>);
  --primary-foreground: oklch(0.99 0 0);
  --muted: oklch(0.96 0.01 <hue>);
  --muted-foreground: oklch(0.5 0.02 <hue>);
  --border: oklch(0.92 0.01 <hue>);
  --destructive: oklch(0.58 0.24 27);
  --success: oklch(0.5 0.14 155);
  /* ...derive the rest; pair every surface with a -foreground */
}
.dark {
  --background: oklch(0.15 0.01 <hue>);
  --foreground: oklch(0.96 0.01 <hue>);
  /* primary usually lightens in dark: oklch(0.72 0.16 <hue>) */
}
```

Map to Tailwind v4 via `@theme inline` (`--color-primary: var(--primary)`), so classes like `bg-primary text-primary-foreground` work and theming is centralized. See [web-tailwind-shadcn.md](web-tailwind-shadcn.md).

## Step 3 — Type

- Pick **one or two** families max (one for UI, optionally one for display or mono). Use a vetted pairing from [resources.md](resources.md); don't default to system-ui alone, which reads as unstyled.
- Lock a **type scale** (e.g. 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48). Body 15–16px.
- Decide heading treatment up front: weight (`semibold` is often better than `bold`), `tracking-tight` on large headings, `text-balance` on headlines.
- Numbers that update → `tabular-nums`.

## Step 4 — Space, radius, elevation, motion

- **Spacing:** commit to a 4/8px scale. Decide default section rhythm (e.g. `space-y-8`) and container width.
- **Radius:** one base `--radius`; derive sm/md/lg/xl from it. Pick from personality (sharp = serious/dense, soft = friendly).
- **Elevation:** prefer borders + subtle neutral shadows over heavy drop shadows. Define 2–3 elevation levels, not ad-hoc.
- **Motion:** pick durations (120–200ms for most UI), easing, and *what* animates (affordances only). Write the restraint down so you don't sprinkle it later.

## Step 5 — Write it down, then build

Produce a short tokens block / theme file as the source of truth, then build every component against it. Once it exists, you are no longer greenfield — switch to [adapt-to-project.md](adapt-to-project.md) discipline and match your own system.

## Checklist

- [ ] Personality named (2–3 adjectives tied to the product)
- [ ] Brand hue chosen from intent, not default violet
- [ ] Semantic tokens with `-foreground` pairs, light + dark
- [ ] Every text/bg pair ≥ 4.5:1 (large ≥ 3:1)
- [ ] One type pairing + a locked scale
- [ ] 4/8px spacing scale, one `--radius`, defined elevation + motion
- [ ] Tokens written to a file as the single source of truth
