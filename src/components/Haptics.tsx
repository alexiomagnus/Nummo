import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createHaptics, type Haptics } from '../theme/haptics';

// The «Vibrazione» preference (Settings, only in the Android app), shared like the icon style: presentation only, never in
// the data. The provider owns the single gate (`createHaptics`), so every control goes through the same minimum gap between
// vibrations, all with the same effect.
const HapticsContext = createContext<{ enabled: boolean; haptics: Haptics }>({ enabled: true, haptics: createHaptics() });
export function HapticsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [haptics] = useState(() => createHaptics());
  const value = useMemo(() => ({ enabled, haptics }), [enabled, haptics]);
  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

// Stable while the preference does not change: safe in callbacks read by native listeners and memoised rows.
export function useHaptics(): () => void {
  const { enabled, haptics } = useContext(HapticsContext);
  return useCallback(() => { haptics(enabled); }, [enabled, haptics]);
}
