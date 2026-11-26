import { useI18n } from '../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { groupGap, spacing } from '../theme/tokens';
import { ScreenLayer } from './ScreenLayer';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };

// A single choice on a screen of its own (user's requests, 24 November: Categoria and Fondo, then the filters of Spese and Analisi,
// «un pannello a parte per coprire tutta la card» instead of a menu under the field). On phones a panel with three positions that
// opens in peek (ScreenLayer `detents` `panel`, `opensHalf`); from medium a screen over the content panel with Back, like the date
// picker. The rows are the grouped glass cards of the app (26 November, on request, after Morphe: each a card, 3 apart, the outer
// corners of the list large); the chosen one is filled with the primary container, outlined in the primary and checked; a tap
// chooses and closes.
// `whole`: on phones it opens whole instead of in peek (Categoria, 26 November, on request).
export function ChoiceScreen<T extends string>({ label, options, value, selectedSuffix, onChoose, onClose, whole = false }: {
  label: string; options: readonly Choice<T>[]; value: T | ''; selectedSuffix: string; whole?: boolean;
  onChoose: (value: T) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return <Portal><ScreenLayer label={label} title={label} backLabel={t("Indietro")} onBack={onClose} onEscape={onClose} detents="panel" opensHalf={!whole} fitPeek="shrink">
    <View role="menu" aria-label={label} {...{ dataSet: { glassGroup: 'true' } }} style={styles.list}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem"
            style={[styles.item, selected && { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]}
            onPress={() => { onClose(); onChoose(option.value); }} accessibilityLabel={`${option.label}${selected ? selectedSuffix : ''}`}>
            {option.icon && <View style={styles.icon}>{option.icon}</View>}
            <Text variant="bodyLarge" numberOfLines={2} style={[styles.label, selected && { color: colors.onPrimaryContainer, fontWeight: '600' }]}>{option.label}</Text>
            <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onPrimaryContainer} />}</View>
          </StateLayerPressable>
        );
      })}
    </View>
  </ScreenLayer></Portal>;
}

const styles = StyleSheet.create({
  list: { gap: groupGap },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  check: { width: 20, height: 20 },
});
