# Visual review — look before you ship

**The law of this skill: never declare UI done without looking at it rendered.** Writing JSX and never seeing the pixels is the single biggest reason AI UI looks AI-made. Close the loop.

## Decision: can you render it?

```
Is there a runnable harness (dev server, Storybook, Expo, a page that mounts this)?
  ├── YES → render + screenshot + critique (below). MANDATORY.
  └── NO  → run the text gate (ai-tells.md) AND tell the user you could not render it.
```

Don't silently skip the render because it's inconvenient. If you can start the app, start it.

## Web — render & screenshot

Use whichever is available:

- **Playwright** (`@playwright/test` or the playwright MCP): navigate to the route, screenshot at multiple widths.
- **Claude-in-Chrome** MCP: open the dev-server URL in a tab and screenshot.
- The project's `run` skill / dev script to start the server first.

Capture at least:
- **Mobile** ~375×812
- **Tablet** ~768 (if layout changes)
- **Desktop** ~1280

And if the app supports it:
- **Dark mode** as well as light
- **Each state** that matters: empty, loading, error, populated

```ts
// Playwright sketch — write screenshots to a TEMP dir, never the repo
const outDir = process.env.TMPDIR ?? "/tmp";
const widths = [375, 768, 1280];
for (const w of widths) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.screenshot({ path: `${outDir}/ui-review-${w}.png`, fullPage: true });
}
```

**Keep the repo clean.** Playwright and MCP browsers default to writing screenshots and a `.playwright-mcp/` dir into the current working directory — i.e. the user's repo. Always direct output to a temp/scratchpad dir, and after reviewing, delete any artifacts (`*.png`, `.playwright-mcp/`, any harness file) that landed in the project. Run `git status` and confirm it's clean before finishing. Never leave review artifacts in a tracked tree.

## Mobile (RN) — render & screenshot

Playwright can't drive RN. Use a simulator/device:
- `expo start` → iOS simulator + Android emulator; screenshot both.
- Look at safe areas, platform chrome, touch target sizes at real density.
- If you can't launch a simulator, say so and fall back to the text gate.

## Critique the real pixels

Look at the screenshots as a design reviewer would. Ask:

1. **Does it look designed or generated?** Run the [ai-tells.md](ai-tells.md) gate against what you *see*, not just the code.
2. **Hierarchy:** does the eye land on the right thing first? Is the primary action obvious?
3. **Spacing rhythm:** consistent, on-scale, balanced? Any cramped or floating elements?
4. **Alignment:** does everything line up to a grid?
5. **Contrast/legibility:** readable? Any gray-on-gray?
6. **States:** did empty/loading/error actually render correctly?
7. **Responsive:** does it hold at 375px? Any overflow or awkward reflow?
8. **Dark mode:** correct, or are there hardcoded-color leaks?
9. **Decoration audit:** any gradient/glow/shadow/motion you can now see is pointless? Cut it.

## Iterate — conditional loop

- **First render looks right** → run the gate, done.
- **First render reveals problems** → fix the specific issues, re-render, re-critique. Loop until it passes the gate. Don't stop at "good enough" if the gate still flags something.
- Show the user the screenshots (and before/after on a restyle) so they can see what you saw.

## Honesty rule

If you could not render it, **say so explicitly** — "I applied the craft gate but could not render this because there's no running harness." Never imply you looked at something you didn't.
