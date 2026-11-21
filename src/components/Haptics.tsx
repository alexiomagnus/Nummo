import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { vibrate, type HapticKind } from '../theme/haptics';

// The «Vibrazione» preference (Settings), shared like the icon style: presentation only, never in the data.
const HapticsContext = createContext(true);
export function HapticsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <HapticsContext.Provider value={enabled}>{children}</HapticsContext.Provider>;
}

// Stable while the preference does not change: safe in callbacks read by native listeners and memoised rows.
export function useHaptics(): (kind?: HapticKind) => void {
  const enabled = useContext(HapticsContext);
  return useCallback((kind: HapticKind = 'tap') => { vibrate(kind, enabled); }, [enabled]);
}
