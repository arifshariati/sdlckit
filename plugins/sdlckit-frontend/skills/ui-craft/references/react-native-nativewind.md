# Mobile — React Native + NativeWind + reanimated

RN is not web. No CSS cascade, no Radix, no DOM. NativeWind brings Tailwind `className` to RN, but the primitives and constraints differ. Expert mobile UI respects platform conventions (iOS HIG + Android Material), not just "Tailwind on a phone."

## NativeWind essentials

- `className` works on core components (`View`, `Text`, `Pressable`, `ScrollView`, `Image`) via NativeWind. Config in `tailwind.config.js` (NativeWind 4 is Tailwind v3-based) + `global.css`.
- **No cascade / inheritance.** `Text` does not inherit color from a parent `View`. Set text styles on `Text` directly.
- **All text in `<Text>`.** Bare strings in a `View` throw.
- **Dark mode** via `dark:` variant + the color scheme; wire tokens the same semantic way, but there's no CSS `:root` — use the config theme or a token object.
- **Platform differences:** `className` covers layout/color/spacing; some native props (shadow, elevation) still need style props or Platform-specific handling.

## Layout & primitives

- **Flexbox only**, and **`flexDirection` defaults to `column`** (unlike web's `row`). No grid, no float.
- Use `SafeAreaView` / `react-native-safe-area-context` for notches and home indicators — never hardcode top/bottom insets.
- `Pressable` (not `TouchableOpacity`) for modern press states; give real pressed feedback.
- `FlatList`/`SectionList` for long lists (virtualized) — not `.map()` in a `ScrollView`.
- `KeyboardAvoidingView` / keyboard handling for forms.

## Platform conventions (the "expert" part)

- **Respect the platform.** iOS and Android have different navigation, back behavior, typography, and control styles. Use `react-navigation` patterns idiomatically; don't force an iOS look on Android or vice versa.
- **Touch targets ≥ 44×44pt.**
- **Native feel:** momentum scroll, pull-to-refresh where expected, haptics for key actions (`expo-haptics`), respect the status bar (`expo-status-bar`).
- **Type:** use the platform or a bundled font consistently; RN font weights behave differently across platforms — test both.
- **Elevation:** iOS uses shadows (`shadowColor/Opacity/Radius`), Android uses `elevation`. NativeWind's `shadow-*` maps imperfectly — verify on both.

## Motion — reanimated

- Use `react-native-reanimated` for 60fps UI-thread animation; avoid the JS-driven `Animated` for anything interactive.
- `Layout` animations, `entering`/`exiting` for list items, shared values for gestures (with `react-native-gesture-handler`).
- Same restraint rule: motion for affordances and transitions, not decoration. Respect reduced-motion (`AccessibilityInfo.isReduceMotionEnabled`).

## Accessibility (RN specifics)

- `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState` on interactive elements.
- `accessibilityHint` for non-obvious actions.
- Test with VoiceOver (iOS) / TalkBack (Android).
- Don't rely on color alone; mind Dynamic Type / font scaling (`allowFontScaling`).

## Mobile-specific tells to avoid

- Web idioms that don't belong: hover states (no hover on touch), `cursor-pointer`, fixed pixel widths.
- Ignoring safe areas (content under the notch / home bar).
- Non-virtualized long lists.
- One platform's look forced on the other.
- Gradient/glow decoration — same addition sins as web (see ai-tells.md).
- Tiny touch targets.

## Verification

Render on a simulator/device (or Expo) and look at **both** iOS and Android at real sizes. See [visual-review.md](visual-review.md). RN can't be screenshotted via Playwright — use a simulator screenshot or Expo, and if you can't run it, say so and fall back to the text gate.

## Minimal expert example — a stat tile (RN, no tells)

```tsx
import { View, Text } from "react-native";

interface StatProps {
  label: string;
  value: string; // pre-formatted
  hint?: string;
}

// Text styles set on <Text> (no inheritance). Border for separation, no gradient/glow.
export function Stat({ label, value, hint }: StatProps) {
  return (
    <View className="rounded-lg border border-border bg-card p-5">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="mt-2 text-3xl font-semibold text-foreground">{value}</Text>
      {hint ? <Text className="mt-1 text-xs text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}
```
