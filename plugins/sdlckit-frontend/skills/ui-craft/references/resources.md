# Resources — vetted starting points

Curated defaults for greenfield work (see greenfield-direction.md). These are *starting points to adapt*, not a fixed house style — derive from product intent each time.

## Type pairings (all free / open)

Pick ONE row. Primary = UI/body; optional display for headlines; mono for code/data.

| Personality | Primary (UI/body) | Display (optional) | Mono |
|-------------|-------------------|--------------------|------|
| Neutral / modern default | Inter, Geist | — | Geist Mono, JetBrains Mono |
| Friendly / rounded | Manrope, Nunito Sans | — | — |
| Editorial / premium | Source Serif / Fraunces (headings) + Inter (body) | Fraunces | — |
| Technical / dense | IBM Plex Sans | — | IBM Plex Mono |
| Geometric / clean | Geist, Satoshi | — | Geist Mono |
| Humanist / warm | Figtree, Hanken Grotesk | — | — |

Rules: one or two families max. Body 15–16px. Don't ship bare `system-ui` as the whole identity — it reads as unstyled.

## Palette recipes (OKLCH brand hue by intent)

Hue angle guide (OKLCH): red 15–30 · orange 45–70 · amber 70–90 · green 145–165 · teal 180–195 · cyan 200–220 · blue 230–260 · indigo 265–285 · purple 290–310 · pink 340–360.

| Product feel | Brand hue | Notes |
|--------------|-----------|-------|
| Calm / health / wellness | teal 185 or green 155 | low-to-mid chroma; soothing |
| Trust / finance / B2B | blue 245 | deep, restrained |
| Premium / luxury | near-neutral + deep blue/green accent | lots of neutral, sparing accent |
| Energetic / consumer | orange 55 or red 25 | high chroma, use sparingly |
| Creative / playful | pink 350 or a dual accent | still one primary |
| Serious / editorial | near-neutral + one warm accent | type does the work |

**Avoid defaulting to purple/indigo (265–310)** unless the brand genuinely calls for it — it's the AI default and a tell.

Brand `--primary` lightness ~0.5–0.6 (light mode), ~0.70–0.78 (dark mode). Chroma: restrained 0.12–0.18 for most apps; 0.20–0.26 only for deliberately vivid consumer brands. Neutrals: chroma ≤ 0.02 with a faint brand-hue cast.

## Spacing scale

4/8px base: `0 1 2 3 4 6 8 12 16 24 32 48 64 96`. Tailwind's default scale already follows this — just use it consistently; don't invent `p-[13px]`.

## Radius scale

One base `--radius`, derive the rest:
- Serious/dense: 0.25–0.375rem
- Balanced default: 0.5–0.625rem
- Friendly/soft: 0.75–1rem
- `sm = base-4px`, `md = base-2px`, `lg = base`, `xl = base+4px`.

## Elevation

2–3 levels, neutral shadows:
- `sm` — subtle border + faint shadow (resting cards)
- `md` — hover / raised
- `lg` — overlays, popovers, modals

Prefer border-first separation; add shadow only for genuine elevation. No colored shadows.

## Motion tokens

- Durations: 120ms (micro), 160–200ms (standard), 250–300ms (large transitions only).
- Easing: `ease-out` for enters, `ease-in-out` for moves.
- Animate: opacity, transform. Avoid animating layout/size where possible.
- Always honor `prefers-reduced-motion`.

## Icon sets

- Web: **lucide-react** (default), heroicons. Pick one.
- RN: lucide-react-native, or `@expo/vector-icons`. Pick one.
- Don't mix sets. If no icon dep exists and you need one or two, inline minimal SVG.

## Inspiration references (for taste calibration, not copying)

Look at real shipped products in the same category before building. Study spacing, type scale, and restraint — then build original. Never copy a specific product's identity.
