import { useEffect, useState } from 'react';
import { AccessibilityInfo, useWindowDimensions } from 'react-native';
import { sizeClassOf, type SizeClass } from './tokens';

export function useSizeClass(): SizeClass {
  return sizeClassOf(useWindowDimensions().width);
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (live) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; subscription.remove(); };
  }, []);
  return reduced;
}
