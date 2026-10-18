# Craft checklist

What separates expert UI from competent UI, once the palette and components exist. These are the details reviewers notice subconsciously.

## Typography

- **Hierarchy by scale, not decoration.** Rank with size + weight + color. Never gradient text to create emphasis.
- **Limited scale.** A few sizes, used consistently. Body 15–16px; don't go below 13px for real content.
- **Weight discipline.** Usually regular + medium + semibold is enough. Reserve bold.
- **`tracking-tight`** on large headings; default tracking on body.
- **`text-balance`** on headlines, `text-pretty` on paragraphs, to avoid ragged orphans.
- **Measure.** Body text line length ~45–75 characters (`max-w-prose` / `max-w-[65ch]`).
- **`tabular-nums`** on anything numeric that changes (metrics, timers, prices, counts).

## Spacing & layout

- **One scale.** 4/8px rhythm everywhere. No eyeballed `p-[13px]`.
- **Alignment grid.** Everything aligns to something — shared left edges, consistent gutters.
- **Whitespace groups, not borders.** Prefer space to separate sections; add a divider/card only when space isn't enough.
- **Left-align** body content and forms. Center only short hero/empty content.
- **Consistent container width** and page padding; responsive gutters (min 16px on mobile).
- **Optical balance** over mechanical symmetry — equal visual weight beats forced equal heights.

## Color usage

- **Semantic tokens only.** No raw hex in components when tokens exist.
- **One accent.** Brand hue for primary actions; neutrals do most of the work. Functional colors (success/warn/error) only for their meaning.
- **Contrast:** body ≥ 4.5:1, large text/UI ≥ 3:1. Don't ship gray-on-gray.
- **Tint with intent.** `/5`–`/10` surface tints are fine for grouping; not as random decoration.

## Depth & borders

- **Flat-first.** Reach for a border before a shadow, a shadow before a gradient.
- **Neutral shadows, 2–3 levels.** No colored shadows.
- **Match the project's radius.** Consistent corners across siblings.

## States — every interactive element

- **Default / hover / active / focus-visible / disabled.** Focus must be visibly keyboard-accessible.
- **Loading:** skeletons mirroring real layout, not a lone spinner.
- **Empty:** designed, with a clear next action and a sentence of context.
- **Error:** inline, specific, actionable.
- **Optimistic / pending** where it improves perceived speed.

## Motion

- **Purpose only.** Animate affordances and state changes, not decoration.
- **Named transitions.** `transition-colors/transform/opacity`, never `transition-all`.
- **Fast.** 120–200ms for most; easing `ease-out` for enters.
- **Respect `prefers-reduced-motion`.**
- **No reflexive hover-lift** on static content.

## Content & copy

- **Real, product-specific copy.** No lorem, no marketing-template filler.
- **Sentence case** for most UI; consistent terminology.
- **Helpful empty/error copy** — tell the user what to do next. Delegate hard wording to `design:ux-copy`.

## Accessibility baseline (delegate full audit to `design:accessibility-review`)

- Semantic HTML / RN roles; headings in order.
- Labels on inputs; `aria-label` on icon-only controls; decorative icons `aria-hidden`.
- Hit targets ≥ 44px on touch.
- Keyboard operable; visible focus; logical tab order.
- Don't rely on color alone to convey meaning.

## Responsive

- **Mobile-first.** Design the narrow layout first, enhance up.
- Test at ~375px, ~768px, ~1280px.
- No horizontal scroll; no fixed widths that overflow small screens.
- Reflow, don't just shrink.
