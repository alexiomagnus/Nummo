import { seriesLabel } from './seriesLabel';
import { useI18n } from '../../i18n/I18nProvider';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Breakdown, Series } from '../../domain/history';
import { transition } from '../../theme/motion';
import { motion, radius, spacing } from '../../theme/tokens';
import { seriesColor, type ChartColors } from './charts';
import { blockLayout, blockRadius, blockTileBounds } from './categoryPresentation';
import { blockLabelPlan, blockLabelColors, type TextMeasure } from './blockLabels';

type Props = {
  data: Breakdown;
  colors: ChartColors;
  active: number | null;
  onActive: (index: number | null) => void;
  percent: (part: number, total: number) => string;
  // Occurrences in the period for a series key (the «Altre» group sums its categories).
  countOf: (key: string) => number;
  // Opens the transactions of a series in the period.
  onOpen: (key: string) => void;
};

// Geometry and selection changes ease; the global reduced-motion rule (GlobalStyle) shortens them to ~0.
const tileTransition = transition(['left', 'top', 'width', 'height', 'opacity', 'background-color', 'border-color'], motion.long);

// Squarified treemap of the spending by category (proportional areas, see treemap.ts). Hover previews a tile, a click or
// tap selects it (second press clears); the panel below always shows the previewed or selected category, so the page does
// not jump while the pointer moves.
export function BlockChart({ data, colors, active, onActive, percent, countOf, onOpen }: Props) {
  const { t, formatAmount } = useI18n();
  const theme = useTheme();
  const fontFamily = theme.fonts.bodyMedium.fontFamily;
  const canvas = useMemo(() => typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'), []);
  const [, refreshFonts] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = () => { if (mounted) refreshFonts((revision) => revision + 1); };
    document.fonts?.addEventListener('loadingdone', refresh);
    void document.fonts?.ready.then(refresh);
    return () => { mounted = false; document.fonts?.removeEventListener('loadingdone', refresh); };
  }, []);
  const measure: TextMeasure = (text, size, weight) => {
    if (!canvas) return Array.from(text).length * size;
    canvas.font = `${weight} ${size}px ${fontFamily}`;
    return canvas.measureText(text).width;
  };
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? active;
  const focus = shown === null ? null : data.series[shown] ?? null;
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width));
  const { height, tiles } = blockLayout(data.series, width);
  const indexOf = new Map<Series, number>(data.series.map((series, index) => [series, index]));
  const { ink, layer } = blockLabelColors(theme.dark, theme.colors.onSurface);
  const muted = { color: theme.colors.onSurfaceVariant };
  const count = focus ? countOf(focus.key) : 0;
  return (
    <View style={styles.chart}>
      <View onLayout={onLayout} style={{ height }} role="group" accessibilityLabel={t("Blocchi delle spese per categoria")}
        onPointerLeave={() => setHovered(null)}>
        {width > 0 && tiles.map(({ item: series, x, y, w, h }) => {
          const index = indexOf.get(series)!;
          const selected = active === index;
          const share = percent(series.total, data.total);
          const bounds = blockTileBounds({ x, y, w, h });
          const corner = blockRadius(bounds, radius.tile);
          const name = seriesLabel(series, t);
          const amount = formatAmount(series.total);
          // Text only, never cut or split: tiles too small for the whole name stay blank (legend and panel name them).
          const labels = blockLabelPlan(bounds.w, bounds.h, { name, amount, percent: share }, measure);
          const typography = { color: ink, fontFamily, fontSize: labels.fontSize, lineHeight: labels.lineHeight, letterSpacing: 0 };
          // With a selection the other tiles recede; the selected one keeps full colour and an outline.
          const dimmed = active !== null && !selected && hovered !== index;
          return (
            <StateLayerPressable key={series.key} layerColor={layer} radius={corner} role="button"
              onPress={() => onActive(selected ? null : index)} aria-pressed={selected}
              onHoverIn={() => setHovered(index)} onHoverOut={() => setHovered((current) => (current === index ? null : current))}
              onFocus={() => setHovered(index)} onBlur={() => setHovered((current) => (current === index ? null : current))}
              accessibilityLabel={`${name}: ${amount}, ${share}`}
              tabIndex={0}
              style={[styles.tile, tileTransition, {
                left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h,
                backgroundColor: seriesColor(series, colors), opacity: dimmed ? 0.55 : 1,
              }]}>
              <View pointerEvents="none" aria-hidden style={[styles.content, { padding: labels.padding }]}>
                {labels.name.length > 0 && <Text numberOfLines={labels.name.length} style={[typography, styles.label]}>{labels.name.join('\n')}</Text>}
                {labels.amount && <Text numberOfLines={1} style={[typography, styles.number]}>{amount}</Text>}
                {labels.percent && <Text numberOfLines={1} style={[typography, styles.number]}>{share}</Text>}
              </View>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, tileTransition, {
                borderWidth: 2, borderColor: selected ? ink : 'transparent', borderRadius: corner,
              }]} />
            </StateLayerPressable>
          );
        })}
      </View>
      {/* Fixed-height details: name, amount, share and transactions of the previewed or selected category. */}
      <View style={[styles.panel, { backgroundColor: theme.colors.elevation.level1 }]} aria-live="polite">
        {focus ? <>
          <View style={styles.panelHeader}>
            <View style={[styles.swatch, { backgroundColor: seriesColor(focus, colors) }]} />
            <Text variant="titleMedium" numberOfLines={2} style={styles.grow}>{seriesLabel(focus, t)}</Text>
          </View>
          <View style={styles.facts}>
            <Text variant="titleLarge" style={styles.amount}>{formatAmount(focus.total)}</Text>
            <Text variant="bodyMedium" style={muted}>{t("{p0} del totale", { p0: percent(focus.total, data.total) })}</Text>
            <Text variant="bodyMedium" style={muted}>{count === 1 ? t("1 transazione") : t("{p0} transazioni", { p0: count })}</Text>
          </View>
          {shown === active
            ? <View style={styles.start}><Button mode="text" compact onPress={() => onOpen(focus.key)}
                icon={({ size, color }) => <SvgIcon shape={iconShapes.list} size={size} color={color} />}>{t("Mostra transazioni")}</Button></View>
            : <Text variant="bodySmall" style={muted}>{t("Seleziona il blocco per vederne le transazioni.")}</Text>}
        </> : <Text variant="bodyMedium" style={muted}>{t("Tocca un blocco per vedere i dettagli della categoria.")}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', overflow: 'hidden' },
  chart: { gap: spacing.md },
  content: { flex: 1, justifyContent: 'center', gap: spacing.xs },
  label: { fontWeight: '600' },
  number: { fontWeight: '400', fontVariant: ['tabular-nums'] },
  // Tall enough for the selected state (header, facts, link): previews and selections never move the legend below.
  panel: { minHeight: 132, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm, justifyContent: 'center' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: spacing.lg, rowGap: spacing.xs },
  amount: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  grow: { flex: 1, minWidth: 0 },
  start: { alignSelf: 'flex-start', marginLeft: -spacing.sm },
});
