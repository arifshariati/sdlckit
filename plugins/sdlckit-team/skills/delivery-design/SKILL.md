---
name: "delivery-design"
description: "Design rulebook: a spec-only design.md with shadcn components and blocks (web) or react-native-reusables (mobile), flows, every state with final copy, accessibility and responsive behavior."
---
# Design rules (spec-only, shadcn)

Spec: `${CLAUDE_PLUGIN_ROOT}/docs/team.md` (decisions 6–7). The quality bar is **ui-craft** — read
the `sdlckit-frontend:ui-craft` skill (load it with the Skill tool), `references/standards.md`, `references/ai-tells.md`, and
the platform reference (`web-tailwind-shadcn.md` or `react-native-nativewind.md`). This rulebook
adds only what a *spec* needs. Template: `D path T-### design` creates `designs/T-###/design.md`.

## Project docs (manifest `delivery.docs`)
If the manifest has `delivery.docs`, the repo's own documents are binding context for your role:
read `delivery.docs.inputs` entries relevant to you (e.g. plan, UI strategy, gaps reports) before
working, cite their IDs (an epic's `ref`, plan IDs) instead of inventing new ones, write ADRs only via
`D new adr` (it lands in `delivery.docs.adrDir` in the repo's ADR style — match existing ADRs there),
and never hand-edit the table or pie in `delivery.docs.statusFile` (the script renders it).

## The contract of a design spec
An engineer must be able to build it **without making a single visual or UX decision**, and QA
must be able to check it **line by line**. If a sentence in your spec needs taste to interpret,
rewrite it as a concrete choice.

## Design language: always shadcn
- **Web:** compose from shadcn/ui **components** (`button`, `card`, `dialog`, `form`, `radio-group`,
  `alert`, `skeleton`, `sonner`, `table`, `sheet`, …) and, for whole screens/sections, start from a
  shadcn **block** (e.g. `dashboard-01`, `login-03`, `sidebar-07`) — name it exactly, then state what
  is changed. Check the real catalogue (ui.shadcn.com/docs/components, ui.shadcn.com/blocks) via
  WebFetch when unsure a component/block or variant exists. Say which are already in the repo
  (`components/ui/*`) and which must be added with `npx shadcn@latest add <name>`.
- **Mobile:** react-native-reusables equivalents on NativeWind; name the same primitives.
- **Repo on another library:** don't design in it and don't mix. Write the design in shadcn and add
  an item recommending a migration ticket (decision: always shadcn).
- Only project tokens (CSS variables / theme). No raw hex, no new shadows/gradients/radii beyond
  the theme scale. Dark mode is specified, not assumed.

## Required sections (template order)
1. **Goal & user** — one sentence each; cite the ticket TACs and traced epic ACs.
2. **User flow** — numbered steps from entry point to every exit (success, cancel, error). Mermaid
   optional for branching.
3. **Screens & layout** — per screen: base block/composition, regions top→bottom, what is primary
   (one primary action per view), responsive behaviour at `sm` (≤640) / `md` / `lg` with what
   collapses, stacks, or moves into a `sheet`.
4. **Component map** — table: Region · shadcn component/block · variant/props · notes. Every
   interactive element appears here. (Script-checked: ≥1 row.)
5. **States** — table rows for **empty, loading, error, success, partial/edge**, plus any
   ticket-specific state (limit reached, expired, offline, permission denied). Each row: trigger ·
   what the user sees · exact copy. Loading uses `skeleton` matching final layout — never a lone
   spinner. Errors say what happened and what to do next.
6. **Copy** — every string, final wording, sentence case, no placeholders ("Lorem", "TBD").
   Buttons are verbs ("Save card", not "OK"). Destructive confirmations name the object.
7. **Interaction & motion** — focus/hover/disabled/pending states; what is optimistic vs waits;
   motion only where it explains a change; `prefers-reduced-motion` behaviour.
8. **Accessibility** — focus order, keyboard paths (incl. Esc/Enter), labels for every control
   (programmatic, not placeholder), live-region announcements (`role="alert"` / `status`),
   contrast via tokens (WCAG 2.2 AA), hit targets ≥ 24px (44px mobile).
9. **Tokens & theme** — tokens used; dark-mode notes.
10. **Out of scope** — what this design deliberately does not cover.
11. **Traces** — TAC ids → where in the design each is satisfied.

## Gate yourself before handing over (ui-craft AI-tells)
No decorative gradients/glows/colored shadows, no icon-chips on every row, no emoji, no hover-lift
on non-interactive cards, no `rounded-xl shadow-lg` everywhere, no more than one accent colour, no
centered body text in data views. Hierarchy comes from type scale, weight, spacing, and alignment.

## Revising
Reviewer requests (PO = intent/copy/scope; TL = buildability/contract) are numbered. Address each
in the spec and list "Request n → change" at the top of the reply. If PO and TL conflict, keep the
PO's *what* and the TL's *how*, and flag the conflict as an item.

`references/…` files belong to the `ui-craft` skill: read them from that skill's base directory, which your context states when the skill loads.
