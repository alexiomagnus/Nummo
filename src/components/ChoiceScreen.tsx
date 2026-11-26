import { useI18n } from '../i18n/I18nProvider';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { ScreenLayer } from './ScreenLayer';
import { StateLayerPressable } from './StateLayerPressable';
import { SvgIcon, iconShapes } from './SvgIcon';

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };

// A single choice on a screen of its own (user's requests, 24 November: Categoria and Fondo, then the filters of Spese and Analisi,
// «un pannello a parte per coprire tutta la card» instead of a menu under the field). On phones a panel with three positions that
// opens in peek (ScreenLayer `detents` `panel`, `opensHalf`); from medium a screen over the content panel with Back, like the date
// picker. The chosen row is filled with `secondaryContainer` and checked; a tap chooses and closes.
// `whole`: on phones it opens whole instead of in peek (Categoria, 26 November, on request).
export function ChoiceScreen<T extends string>({ label, options, value, selectedSuffix, onChoose, onClose, whole = false }: {
  label: string; options: readonly Choice<T>[]; value: T | ''; selectedSuffix: string; whole?: boolean;
  onChoose: (value: T) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  return <Portal><ScreenLayer label={label} title={label} backLabel={t("Indietro")} onBack={onClose} onEscape={onClose} detents="panel" opensHalf={!whole} fitPeek="shrink">
    <View role="menu" aria-label={label} style={compact ? styles.edgeToEdge : styles.inset}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <StateLayerPressable key={option.value} layerColor={colors.onSurface} accessibilityRole="menuitem" radius={compact ? 0 : radius.control}
            style={[styles.item, !compact && styles.rounded, selected && { backgroundColor: colors.secondaryContainer }]}
            onPress={() => { onClose(); onChoose(option.value); }} accessibilityLabel={`${option.label}${selected ? selectedSuffix : ''}`}>
            {option.icon && <View style={styles.icon}>{option.icon}</View>}
            <Text variant="bodyLarge" numberOfLines={2} style={[styles.label, selected && { color: colors.onSecondaryContainer }]}>{option.label}</Text>
            <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onSecondaryContainer} />}</View>
          </StateLayerPressable>
        );
      })}
    </View>
  </ScreenLayer></Portal>;
}

const styles = StyleSheet.create({
  // Phones: rows edge to edge of the panel, as in the bottom sheet (the screen's own side margins are cancelled).
  edgeToEdge: { marginHorizontal: -spacing.md },
  // From medium: rows inside the screen's margins, rounded, a little apart.
  inset: { gap: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg },
  rounded: { borderRadius: radius.control },
  icon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  check: { width: 20, height: 20 },
});
