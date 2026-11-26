import { useMemo, useSyncExternalStore } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currentTopInset, subscribeTopInset } from '../services/androidApp';

// Safe-area insets plus the Android app's status bar (the app lets the page draw under it, 0.3.12): `env(safe-area-inset-top)`
// is 0 in a WebView, so the top comes from the bridge. Everywhere else it is the plain safe area.
export function useInsets() {
  const insets = useSafeAreaInsets();
  const app = useSyncExternalStore(subscribeTopInset, currentTopInset, () => 0);
  return useMemo(() => ({ ...insets, top: Math.max(insets.top, app) }), [insets, app]);
}
