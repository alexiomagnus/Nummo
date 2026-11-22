import { createContext, useContext, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useSizeClass } from '../theme/useSizeClass';

// Buttons that share one width, the widest of their labels (the actions of «Archiviazione e backup»: storage, mode transfer
// and backup files, 21–22 November, user's requests). Measured in the current language, so switching language measures again
// from the natural widths. Phones: nothing, the buttons are stacked at full width by their rows.
type Measured = { locale: string; width: number };
type Group = { measured: Measured; measure: (width: number) => void };

const SameWidthContext = createContext<Group | null>(null);

function useGroup(): Group {
  const { locale } = useI18n();
  const [measured, setMeasured] = useState<Measured>({ locale: '', width: 0 });
  const measure = (width: number) => setMeasured((old) => {
    const base = old.locale === locale ? old.width : 0;
    return width > base + 0.5 ? { locale, width: Math.ceil(width) } : old.locale === locale ? old : { locale, width: base };
  });
  return { measured, measure };
}

// Every `useSameWidth` below shares the same width.
export function SameWidthGroup({ children }: { children: ReactNode }) {
  return <SameWidthContext.Provider value={useGroup()}>{children}</SameWidthContext.Provider>;
}

// A button alone on its row as wide as two of the group (`gap` between them), from medium; it does not measure itself, so the
// group's width stays that of one label (22 November, user's request: «Cambia modalità» spans the two transfer buttons below).
export function doubleWidth(single: { style?: { minWidth: number } | null }, gap: number): { minWidth: number } | null {
  return single.style ? { minWidth: single.style.minWidth * 2 + gap } : null;
}

// Props for a button of the group (`style` with the shared minimum width, `onLayout` to measure it). Outside a group,
// the buttons of the calling component share a width among themselves.
export function useSameWidth(): { style?: { minWidth: number } | null; onLayout?: (event: { nativeEvent: { layout: { width: number } } }) => void } {
  const { locale } = useI18n();
  const compact = useSizeClass() === 'compact';
  const own = useGroup();
  const { measured, measure } = useContext(SameWidthContext) ?? own;
  if (compact) return {};
  return {
    style: measured.locale === locale && measured.width > 0 ? { minWidth: measured.width } : null,
    onLayout: (event) => measure(event.nativeEvent.layout.width),
  };
}
