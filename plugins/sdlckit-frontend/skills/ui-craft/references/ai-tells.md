# AI Tells — the blacklist & the gate

The things that make UI look machine-generated. Most are **sins of addition**: decoration added with no reason. A few are **sins of omission** (missing states). Run the gate at the bottom before declaring any UI done.

## Tier 1 — Dead giveaways (never do these)

| Tell | Why it reads as AI | Do instead |
|------|-------------------|------------|
| **Violet/indigo/purple by default** | The unprompted LLM default hue | Derive the hue from product intent (greenfield-direction.md) or use the project's brand |
| **Gradient text / gradient headings** | `bg-gradient-to-r ... bg-clip-text` is a signature tell | Solid color. Weight and size create hierarchy, not rainbows |
| **Emoji as icons or bullets** | 🚀✨🎯 in UI chrome | A real icon set (lucide on web), or no icon |
| **Decorative gradient washes & glows** | `bg-gradient-to-b from-primary/10`, blurred radial "glow" blobs behind heroes | Flat background, or a token surface. Gradient only when it encodes depth/state |
| **Everything in a Card** | Every section boxed + bordered + shadowed | Use whitespace and type hierarchy to group; cards only for genuinely card-like, liftable content |
| **Center-everything layouts** | Every page `text-center items-center` | Left-align body and forms; center only short hero/empty-state content |

## Tier 2 — Leaks through even in "good" output (observed in baselines)

These appeared even when the agent adapted correctly to a real design system. Highest-value to catch:

| Tell | Fix |
|------|-----|
| **`transition-all`** | Name the property: `transition-colors`, `transition-transform`, `transition-opacity` |
| **Uniform hover-lift / `scale-[1.02]`** on every card | Reserve motion for real affordances (buttons, interactive rows). Static content doesn't animate |
| **Colored shadows** (`shadow-primary/10`) | Neutral shadow, or elevation via surface/border. Colored shadow is gimmick |
| **`rounded-xl shadow-lg` on everything** | Match the project's radius + elevation tokens. Don't import one habit everywhere |
| **Icon-in-tinted-chip everywhere** | A rounded square with a tinted bg behind every icon is a dashboard cliché. Use sparingly |
| **Placeholder marketing copy** | "Simple, transparent pricing", "No hidden fees, cancel anytime", "Welcome back!" → write product-true copy or delegate to `design:ux-copy` |

## Tier 3 — Sins of omission (missing craft)

| Missing | Add |
|---------|-----|
| No empty state | Every list/table/collection needs a designed empty state with a next action |
| No loading state | Skeletons that mirror the real layout (not a centered spinner) |
| No error state | Inline, actionable error — not a raw thrown message |
| No focus-visible styles | Keyboard focus must be visible on every interactive element |
| Numbers that jitter | `tabular-nums` on metrics, timers, prices |
| Off-scale spacing | Snap to the 4/8px scale; no `p-[13px]` one-offs |
| Icon-only buttons with no label | `aria-label`; decorative icons `aria-hidden` |

## Deeper structural tells

- **No typographic hierarchy** — everything one or two sizes; weight/size/color not used to rank. Real UI has a clear scale.
- **Too many font weights/sizes** — the opposite failure. Pick a scale and stick to it.
- **Symmetry obsession** — three identical cards forced to equal height with awkward `min-h`. Let content breathe; align intentionally.
- **No alignment grid** — elements not sharing edges. Everything should align to something.
- **Generic naming in copy** — "Dashboard", "Overview", "Welcome to your dashboard!" where a product-specific label belongs.
- **Contrast failures** — low-contrast gray-on-gray text. Body text ≥ 4.5:1, large text ≥ 3:1.

## The gate — run before declaring done

Answer every question. Any "yes" in the first block, or "no" in the second, means **not done**.

**Did I add any of these without a reason?**
- [ ] Gradient, glow, or colored shadow that doesn't encode state/depth/hierarchy
- [ ] `transition-all` or motion on non-interactive elements
- [ ] A card/border/tint around something that isn't a distinct object
- [ ] More than one accent color
- [ ] Default purple/violet on a greenfield project
- [ ] Emoji in UI chrome

**Did I include all of these?**
- [ ] Real, product-specific copy (no filler)
- [ ] Empty, loading, and error states for anything async or list-like
- [ ] Visible keyboard focus on interactive elements
- [ ] Spacing on the 4/8px scale
- [ ] Contrast checked (≥4.5:1 body)
- [ ] Matched the project's radius / shadow / density (or derived intentionally)

**Then:** render it and look (visual-review.md). The gate is necessary but the eyes are final.
