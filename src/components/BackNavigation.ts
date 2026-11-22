import { useEffect, useRef } from 'react';
import { createBackStack, type BackLevel, type BackStack } from '../theme/backStack';

// One stack for the page (see `theme/backStack.ts`), created at the first layer.
let shared: BackStack | null = null;
function backStack(): BackStack | null {
  if (!shared && typeof window !== 'undefined' && typeof window.history?.pushState === 'function') shared = createBackStack(window);
  return shared;
}

// While `active`, Back calls `onBack` instead of leaving the app; `onBack` returns false to refuse (the layer stays).
// `key`: a layer that stays open after Back under a new identity (a page that leads to another page) registers again
// when the key changes, since Back has already removed it from the stack.
export function useBackLayer(active: boolean, level: BackLevel, onBack: () => boolean | void, key?: unknown) {
  const latest = useRef(onBack);
  latest.current = onBack;
  useEffect(() => {
    if (!active) return;
    return backStack()?.register(level, () => latest.current() !== false);
  }, [active, level, key]);
}
