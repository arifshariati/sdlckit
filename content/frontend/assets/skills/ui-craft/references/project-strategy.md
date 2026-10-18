# Project UI strategy, templates, and themes

Use this when a project needs a UI strategy document, reusable screen templates, or a theme
control. It is the reusable form of the flowdemo redesign (`docs/ui/UI-STRATEGY.md` in that repo).

## 1. Write the strategy first (one page, in the repo)

Put it at `docs/ui/UI-STRATEGY.md`. Cover these, in this order:

1. **Direction** in three to five plain statements (for example: neutral surfaces, one primary,
   compact type, 1 px borders, no decoration). Say what it is not.
2. **Token map.** A table of roles to light and dark values, with the contrast checked per role
   (4.5:1 text, 3:1 non-text). Tokens live in the stylesheet; components never hold raw colors.
3. **Type scale and font.** One UI face, one mono face, the minimum sizes (body, status, labels).
4. **Layout breakpoints** and what each panel does at each one. Name the phone behavior explicitly.
5. **Block map.** Which shadcn blocks are used, as patterns or as installed code. Blocks are
   copied in and re-skinned with tokens. Their default palette is never imported.
6. **State matrix.** Empty, loading, error, and populated for each dynamic surface.
7. **Verification.** Gates, e2e, and screenshots at phone and desktop widths in light and dark.
8. **Decisions log.** Date, decision, and what it supersedes. A locked decision changes only by a
   new entry, never a silent edit.

## 2. Templates

Build templates as compositions of existing primitives, not new components:

- **App shell:** a header, a left rail, a main area, and an optional right panel. Collapse the rail
  to a sheet or a list below the tablet breakpoint.
- **List page:** a title row with one primary action, a filter row, then a list or table with
  the four states.
- **Detail or settings page:** a section per concern, with labels above fields and one save action.
- **Canvas or editor:** keep it custom. Blocks rarely fit a node or graph surface.

## 3. Themes

- Themes are **tokens**, not component code. Each theme is a block of variables on `:root`, with
  a `[data-theme="<name>"]` override and a dark variant.
- The control is a menu with radio items. Saved under one storage key, read and written inside
  try/catch, and applied through an attribute on `<html>`.
- A blocking script in the page head applies a saved choice before first paint, so there is no
  flash. Keep it in a file under `public/` if the linter checks inline scripts.
- Scope the picker deliberately. Mode alone (light, dark, system) keeps every screenshot
  comparable. Presets, density, and font are a separate decision, and each one multiplies the
  visual states to check.

## 4. Checks before calling a strategy done

- Every token role has a value in both modes and passes contrast.
- No raw color or font outside the stylesheet (grep for hex values in components).
- The phone behavior is written down, not left to the default.
- The strategy names the blocks it uses and says which are patterns only.
