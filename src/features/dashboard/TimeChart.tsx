import { useState } from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import type { dashboardInsights } from './insights';

type Day = ReturnType<typeof dashboardInsights>['days'][number];
export function TimeChart({ days }: { days: readonly Day[] }) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const index = Math.min(selected ?? days.length - 1, days.length - 1);
  const day = days[index];
  const max = Math.max(1, ...days.map(day => day.total));
  const x = (i: number) => 12 + i / Math.max(1, days.length - 1) * 976;
  const y = (total: number) => 126 - total / max * 108;
  const points = days.map((day, i) => x(i) + ',' + y(day.total)).join(' ');
  if (!day) return null;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: spacing.sm }}>
    <Text variant="titleMedium">{t('Andamento nel tempo')}</Text>
    <Text variant="bodyMedium" accessibilityLiveRegion="polite">{formatDate(day.date)} · {formatAmount(day.total)}</Text>
    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>{formatAmount(Math.max(...days.map(day => day.total), 0))}</Text>
    <svg viewBox="0 0 1000 144" preserveAspectRatio="none" style={{ width: '100%', height: 150, touchAction: 'pan-y' }}
      role="slider" tabIndex={0} aria-label={t('Spese giornaliere: usa le frecce per cambiare giorno')}
      aria-valuemin={1} aria-valuemax={days.length} aria-valuenow={index + 1}
      aria-valuetext={formatDate(day.date) + ': ' + formatAmount(day.total)}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          setSelected(event.key === 'Home' ? 0 : event.key === 'End' ? days.length - 1 : Math.max(0, Math.min(days.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1))));
        }
      }}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSelected(Math.max(0, Math.min(days.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 1000 - 12) / 976 * (days.length - 1)))));
      }}
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSelected(Math.max(0, Math.min(days.length - 1, Math.round(((event.clientX - rect.left) / rect.width * 1000 - 12) / 976 * (days.length - 1)))));
      }}>
      {[0, 0.5, 1].map(ratio => <line key={ratio} x1="12" x2="988" y1={y(max * ratio)} y2={y(max * ratio)} stroke={colors.outlineVariant} />)}
      <polyline points={points} fill="none" stroke={colors.primary} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1={x(index)} x2={x(index)} y1="12" y2="132" stroke={colors.outline} strokeDasharray="4 4" />
      <circle cx={x(index)} cy={y(day.total)} r="4" fill={colors.primary} />
    </svg>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length: Math.max(2, Math.min(5, Math.floor(width / 130))) }, (_, i) => i).map((_, i, all) => Math.round(i / (all.length - 1) * (days.length - 1))).filter((value, i, all) => all.indexOf(value) === i).map(i =>
        <Text key={i} variant="labelSmall">{formatDate(days[i]!.date, days.length > 120 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' })}</Text>)}
    </View>
  </View>;
}
