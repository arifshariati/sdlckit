---
name: "eng-react-native"
description: "React Native rulebook: navigation, native modules, platform differences, lists and performance, storage, notifications, auth sessions and NativeWind styling. Tuned for Expo."
---
# React Native / Expo rules

Shares the React mental model ([[eng-react]]) but with native constraints.

## Navigation
- Use the repo's navigator (React Navigation). Type the route params. Don't duplicate navigation
  state in component state. Handle deep links (`expo-linking`) and auth-gated routes explicitly.

## Platform & Expo
- Account for iOS/Android differences (safe areas, keyboard behavior, back button, permissions).
  Use `Platform.select` rather than branching UI ad hoc.
- Stay within the Expo managed workflow unless a native module forces otherwise; prefer Expo SDK
  modules (`expo-notifications`, `expo-auth-session`, `expo-crypto`) over raw native when available.
- Guard permissions (notifications, etc.): request at the right moment, handle denial gracefully.

## Lists & performance
- Use `FlatList`/`FlashList` with `keyExtractor`, stable keys, and memoized `renderItem`. Never map
  large arrays into a `ScrollView`. Avoid heavy work on the JS thread during gestures/animation.
- Keep images sized; avoid re-renders from inline styles/objects. Use `InteractionManager` for
  post-animation work.

## State, storage, auth
- Persist only what's needed via `@react-native-async-storage`; it's async — handle hydration and
  loading. Don't store secrets/tokens in plain async storage; use secure storage for sensitive data.
- Supabase auth session: handle refresh, sign-out, and the app foreground/background transitions.

## Styling
- NativeWind + shared `the theme package`/`the core package`. Keep parity with web design tokens where the
  shared packages define them. No parallel styling system.

## Networking & offline
- Handle flaky networks: timeouts, retries, offline states, optimistic UI only with reconciliation.
  Never assume connectivity.

## Avoid
ScrollView for long lists · unstable list keys · secrets in async storage · ignoring platform
differences · heavy JS-thread work during animation · untyped navigation params · unhandled
permission denial.

Emit the YAML findings contract (the `findings-contract` rulebook).
