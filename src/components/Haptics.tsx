import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createHaptics, type HapticKind, type Haptics } from '../theme/haptics';

// The «Vibrazione» preference (Settings), shared like the icon style: presentation only, never in the data. The provider
// owns the single gate (`createHaptics`), so every control goes through the same minimum gap between vibrations.
const HapticsContext = createContext<{ enabled: boolean; haptics: Haptics }>({ enabled: true, haptics: createHaptics() });
export function HapticsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [haptics] = useState(() => createHaptics());
  const value = useMemo(() => ({ enabled, haptics }), [enabled, haptics]);
  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

// Stable while the preference does not change: safe in callbacks read by native listeners and memoised rows.
export function useHaptics(): (kind?: HapticKind) => void {
  const { enabled, haptics } = useContext(HapticsContext);
  return useCallback((kind: HapticKind = 'tap') => { haptics(kind, enabled); }, [enabled, haptics]);
}
