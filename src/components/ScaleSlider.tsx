import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useI18n } from '../i18n/I18nProvider';
import { radius, spacing } from '../theme/tokens';
import { uiScaleMax, uiScaleMin, uiScaleStep } from '../theme/uiScale';

// «Scala dell'interfaccia» (27 November, on request, after Morphe's slider): the value large in a tonal box, then a bar with a
// vertical handle between the two ends. A real range input underneath (keyboard, screen reader, touch for free), dressed by
// `[data-scale-slider]` in GlobalStyle. While it is dragged only the number changes; the scale is applied on release (`change`),
// because re-laying out the whole page on every step would stutter.
export function ScaleSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement | null>(null);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    const node = input.current;
    if (!node) return undefined;
    const commit = () => latest.current(Number(node.value));
    node.addEventListener('change', commit);
    return () => node.removeEventListener('change', commit);
  }, []);
  const share = (draft - uiScaleMin) / (uiScaleMax - uiScaleMin);
  return (
    <View style={styles.box}>
      <View style={[styles.value, { backgroundColor: colors.primaryContainer }]}>
        <Text variant="displaySmall" style={{ color: colors.onPrimaryContainer, fontWeight: '700' }}>{`${draft}%`}</Text>
        <Text variant="bodyLarge" style={{ color: colors.onPrimaryContainer, opacity: 0.85 }}>{t("Scala dell'interfaccia")}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{`${uiScaleMin}%`}</Text>
        <View style={styles.track}>
          <input ref={input} type="range" min={uiScaleMin} max={uiScaleMax} step={uiScaleStep} value={draft}
            aria-label={t("Scala dell'interfaccia")} aria-valuetext={`${draft}%`} data-scale-slider=""
            onChange={(event) => setDraft(Number(event.target.value))}
            style={{ ['--fill' as string]: `${share * 100}%`, ['--on' as string]: colors.primary, ['--off' as string]: colors.primaryContainer }} />
        </View>
        <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>{`${uiScaleMax}%`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.lg, padding: spacing.lg },
  value: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 40, justifyContent: 'center' },
});
