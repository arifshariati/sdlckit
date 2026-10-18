# The standard — the bar, held automatically

This is what "to the mark" means. It is the quality every user-facing surface meets by default, on every project, without the user asking for it. These are the principles the best product teams on the internet apply — encoded here as the operating bar, not as reading homework. When the surrounding codebase is below this bar, build to *this*, not to the codebase.

## The bar, in one line

> A user should never notice the UI — only accomplish their goal, quickly, without confusion, on any device, with any ability, and come away feeling the product is trustworthy and cared-for.

If a surface fails that, it is not done.

## 1. Visual design (make hierarchy obvious)

- **Hierarchy first.** Every screen has one clear primary action and a deliberate visual rank. Establish it with size, weight, color, and spacing — never with decoration. The eye should land in the right place within a second.
- **Contrast creates emphasis, not color.** De-emphasize with lighter weight/muted color before adding anything. Most UI is neutral; the accent is rare and therefore meaningful.
- **Space is the primary tool.** Generous, consistent whitespace on a 4/8px scale. Group with proximity before boxes or borders. Crowding reads as cheap.
- **Alignment is non-negotiable.** Everything aligns to a grid. Shared edges, consistent gutters, optical balance over mechanical symmetry.
- **Depth is subtle and physical.** Light comes from above; shadows are soft, neutral, and few. Prefer a border, then a faint shadow, then (rarely) elevation. Never colored shadows or glows as decoration.
- **Type does heavy lifting.** A limited scale, restrained weights, tight tracking on large headings, comfortable line-length (45–75ch) and line-height (~1.5 body). (Full craft detail in [craft-checklist.md](craft-checklist.md).)

## 2. Interaction & UX laws

Apply these by default:

- **Jakob's Law** — users expect your app to work like the others they know. Honor established patterns; don't reinvent a date picker or a nav.
- **Hick's Law** — fewer choices, faster decisions. Reduce options; use progressive disclosure for advanced/rare actions.
- **Fitts's Law** — important/frequent targets are large and close; hit targets ≥ 44px. Don't put destructive actions next to common ones.
- **Miller's Law** — chunk information (≈5–7 groups). Break long forms and dense data into digestible sections.
- **Doherty Threshold** — respond in < 400ms or show immediate feedback (optimistic UI, skeletons). Perceived speed is a feature.
- **Aesthetic–Usability Effect** — polished UI is *trusted* and forgiven more; craft is functional, not vanity.
- **Recognition over recall** — show options, don't make users remember them. Labels, not just icons. Persistent context.
- **Postel / robustness** — be forgiving of input (trim, parse, accept formats); be precise in output.
- **Error prevention over error messages** — disable impossible actions, confirm destructive ones, validate inline before submit.

## 3. Nielsen's heuristics (the usability floor)

Visibility of system status · match to the real world · user control & undo · consistency & standards · error prevention · recognition over recall · flexibility/shortcuts · aesthetic & minimalist design · help users recover from errors · help & documentation where needed. Any surface that violates one of these is below the bar.

## 4. Feedback, states & perceived performance

- **Every action acknowledges itself** immediately — pressed states, loading indicators, success/failure feedback.
- **Four states for anything dynamic:** empty (designed, with a next action), loading (skeletons mirroring layout), error (inline, specific, recoverable), populated. Never ship only the happy path.
- **Optimistic UI** where safe; reconcile on response.
- **No layout shift** when content loads — reserve space (prevents CLS).
- **Latency honesty** — if something takes time, show progress; if it's instant, don't add fake spinners.

## 5. Accessibility — first-class, WCAG 2.2 AA by default

Not an audit afterthought — built in:

- Semantic structure (headings in order, landmarks, lists, real buttons/links); RN roles on mobile.
- Keyboard operable end to end; visible focus; logical order; no traps.
- Labels on all inputs; `aria-label` on icon-only controls; decorative imagery hidden.
- Contrast ≥ 4.5:1 text / 3:1 large & UI; never color alone to convey meaning.
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, and font scaling / Dynamic Type.
- Hit targets ≥ 44px; error messages announced; forms describe their errors.
- For depth, delegate the formal audit to `design:accessibility-review`.

## 6. Performance budget (part of "to the mark")

User-facing excellence includes it being fast:

- **Core Web Vitals** targets: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Images: right-sized, modern formats, explicit dimensions, lazy below the fold.
- Don't ship a UI library for one component; avoid layout thrash; animate transform/opacity only.
- Fonts: preload/`font-display: swap`; subset where possible.
- Virtualize long lists; defer and code-split heavy/below-the-fold work.

## 7. Content & microcopy

- **Clear, concise, human.** Say what happens, in the user's words. No jargon, no marketing filler, no lorem.
- **Action-labeled buttons** ("Save changes", not "Submit"/"OK").
- **Helpful empty & error copy** that tells the user what to do next.
- **Consistent terminology and sentence case.** Delegate hard wording to `design:ux-copy`.

## 8. Platform fidelity

- **Web** — follow platform and WAI-ARIA Authoring Practices for interactive patterns; respect OS dark mode and reduced motion.
- **iOS** — Apple Human Interface Guidelines: navigation, gestures, safe areas, Dynamic Type, haptics.
- **Android** — Material Design: elevation, touch ripples, back behavior, system bars.
- Never force one platform's conventions onto the other. (Detail in [react-native-nativewind.md](react-native-nativewind.md).)

## 9. Responsive & resilient

- Mobile-first; verify ~375 / ~768 / ~1280. Reflow, don't shrink. No horizontal scroll.
- Degrade gracefully: long text, missing data, slow network, small and very large screens.
- Design the real content extremes (0 items, 1 item, 10,000 items; short and very long strings).

## The self-check — "is this to the mark?"

Before done, confirm — honestly, by looking at it rendered:

- [ ] A first-time user knows instantly what to do here
- [ ] Clear hierarchy; one obvious primary action
- [ ] Spacing, alignment, type, and color are disciplined and consistent
- [ ] All four states exist for anything dynamic
- [ ] Fully keyboard + screen-reader operable; AA contrast
- [ ] No layout shift; feels instant or shows feedback
- [ ] Copy is human, specific, and helpful
- [ ] Works and looks right at mobile and desktop, light and dark
- [ ] It would look at home shipped by a top-tier product team — and shows no AI tells ([ai-tells.md](ai-tells.md))

Anything unchecked means **not done** — fix it, don't ship it.
