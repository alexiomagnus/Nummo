import { useI18n } from '../../i18n/I18nProvider';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { merchantPolicy, suggestMerchants, type RankedMerchant } from '../../domain/merchant';
import { clipToLength } from '../../domain/policy';
import { leadingIcon } from '../../components/FieldIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { iconShapes } from '../../components/SvgIcon';
import { inputOutline, radius, spacing } from '../../theme/tokens';

type Props = {
  value: string;
  // Saved merchants, best first (rankMerchants): the suggestions follow this order.
  merchants: readonly RankedMerchant[];
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

// «Esercente»: free text, optional. While typing, the merchants already used that match are proposed below the field (most
// used and most recent first); picking one writes its saved name, ignoring them keeps what was typed. No catalogue, no
// confirmation: on save the text is matched to an existing merchant whatever its capitals, or becomes a new one.
// The list is a combobox listbox in the flow of the form (no overlay): the field keeps the focus and the keyboard while
// the list is open, arrows + Enter pick from the keyboard, Escape closes it.
export function MerchantField({ value, merchants, error, disabled, onChange }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const listId = `merchant-suggestions-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [focused, setFocused] = useState(false);
  // Closed after a pick or Escape, until the text changes again.
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useMemo(() => suggestMerchants(merchants, value), [merchants, value]);
  const open = focused && !dismissed && !disabled && suggestions.length > 0;
  useEffect(() => { setActive(-1); }, [value, open]);

  // A press on a suggestion must not take the focus from the field (on phones it would close the keyboard first and
  // the list with it): the default of mousedown is what moves the focus.
  const listRef = useCallback((node: unknown) => {
    const element = node as HTMLElement | null;
    if (!element || typeof element.addEventListener !== 'function') return;
    element.addEventListener('mousedown', (event) => event.preventDefault());
  }, []);
  const pick = (merchant: RankedMerchant) => { onChange(merchant.name); setDismissed(true); };
  const onKeyPress = (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = event.nativeEvent.key;
    if (!open) return;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault?.();
      setActive((index) => key === 'ArrowDown' ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length : index) - 1);
    } else if (key === 'Enter' && active >= 0) {
      event.preventDefault?.();
      pick(suggestions[active]!);
    } else if (key === 'Escape') {
      setDismissed(true);
    }
  };
  const optionId = (index: number) => `${listId}-${index}`;
  return (
    <View>
      <TextInput outlineStyle={inputOutline} label={t("Esercente")} value={value} mode="outlined" error={Boolean(error)}
        placeholder={t("Facoltativo, es. Supermercato")} left={leadingIcon(iconShapes.store)}
        onChangeText={(text) => { onChange(clipToLength(text, merchantPolicy.maxNameLength)); setDismissed(false); }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyPress={onKeyPress}
        readOnly={disabled} aria-disabled={disabled} autoCapitalize="words" autoCorrect={false} autoComplete="off"
        accessibilityLabel={t("Esercente, facoltativo")}
        {...{ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open, 'aria-controls': open ? listId : undefined,
          'aria-activedescendant': open && active >= 0 ? optionId(active) : undefined }} />
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      {open && (
        <Surface elevation={2} style={[styles.list, { backgroundColor: colors.elevation.level2 }]}>
          <View ref={listRef} nativeID={listId} {...({ role: 'listbox', 'aria-label': t("Esercenti già usati") } as object)}>
            {suggestions.map((merchant, index) => (
              <StateLayerPressable key={merchant.id} nativeID={optionId(index)} layerColor={colors.onSurface} onPress={() => pick(merchant)}
                role="option" aria-selected={index === active} tabIndex={-1}
                style={[styles.option, index === active && { backgroundColor: colors.secondaryContainer }]}>
                <Text variant="bodyLarge" numberOfLines={1}
                  style={{ color: index === active ? colors.onSecondaryContainer : colors.onSurface }}>{merchant.name}</Text>
              </StateLayerPressable>
            ))}
          </View>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Like the anchored menus: rounded surface, rows edge to edge so the highlight covers the whole row.
  list: { marginTop: spacing.xs, borderRadius: radius.control, overflow: 'hidden' },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg },
});
