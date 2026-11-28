import { useMemo, useSyncExternalStore } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentBottomInset, currentTopInset, subscribeTopInset } from '../services/androidApp';

// Safe-area insets plus the Android app's status and navigation bars (the app lets the page draw under both, 0.3.12 and 0.3.15):
// `env(safe-area-inset-*)` is 0 in a WebView, so they come from the bridge. Everywhere else it is the plain safe area.
export function useInsets() {
  const insets = useSafeAreaInsets();
  const top = useSyncExternalStore(subscribeTopInset, currentTopInset, () => 0);
  const bottom = useSyncExternalStore(subscribeTopInset, currentBottomInset, () => 0);
  return useMemo(() => ({ ...insets, top: Math.max(insets.top, top), bottom: Math.max(insets.bottom, bottom) }), [insets, top, bottom]);
}
