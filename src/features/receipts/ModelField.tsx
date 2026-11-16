import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { decorativeIcon } from '../../components/FieldIcon';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { iconShapes, SvgIcon } from '../../components/SvgIcon';
import { matchModels } from '../../domain/receiptAi';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, radius, spacing } from '../../theme/tokens';

type Props = {
  value: string;
  // Models listed by the provider; empty = nothing to propose, the field is plain free text.
  models: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
};

// «Modello»: a combobox with search. With a list from the provider the models open below the field on focus and narrow
// down while typing; any other name can still be written by hand (the list may be missing, filtered or out of date).
// Same pattern as MerchantField: listbox in the flow of the page (no overlay), the field keeps focus and keyboard,
// arrows + Enter pick, Escape closes.
export function ModelField({ value, models, placeholder, onChange }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const listId = `model-options-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [focused, setFocused] = useState(false);
  // Closed after a pick or Escape, until the text changes or the field is entered again.
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(-1);
  const options = useMemo(() => matchModels(models, value), [models, value]);
  const open = focused && !dismissed && options.length > 0;
  useEffect(() => { setActive(-1); }, [value, open]);
  const optionId = (index: number) => `${listId}-${index}`;
  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  // A press on an option must not take the focus from the field (it would close the list before the click).
  const listRef = useCallback((node: unknown) => {
    const element = node as HTMLElement | null;
    if (!element || typeof element.addEventListener !== 'function') return;
    element.addEventListener('mousedown', (event) => event.preventDefault());
  }, []);
  const pick = (model: string) => { onChange(model); setDismissed(true); };
  const onKeyPress = (event: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const key = event.nativeEvent.key;
    if (!open) { if (key === 'ArrowDown') setDismissed(false); return; }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault?.();
      setActive((index) => key === 'ArrowDown' ? (index + 1) % options.length : (index <= 0 ? options.length : index) - 1);
    } else if (key === 'Enter' && active >= 0) {
      event.preventDefault?.();
      pick(options[active]!);
    } else if (key === 'Escape') {
      setDismissed(true);
    }
  };
  return (
    <View>
      <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Modello")} value={value} placeholder={placeholder}
        right={models.length > 0 ? decorativeIcon(({ size, color }) => <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />) : undefined}
        onChangeText={(text) => { onChange(text); setDismissed(false); }}
        onFocus={() => { setFocused(true); setDismissed(false); }} onBlur={() => setFocused(false)} onKeyPress={onKeyPress}
        autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="off"
        {...{ role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': open, 'aria-controls': open ? listId : undefined,
          'aria-activedescendant': open && active >= 0 ? optionId(active) : undefined }} />
      {open && (
        <Surface elevation={2} style={[styles.list, { backgroundColor: colors.elevation.level2 }]}>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="always">
            <View ref={listRef} nativeID={listId} {...({ role: 'listbox', 'aria-label': t("Modelli disponibili") } as object)}>
              {options.map((model, index) => {
                const chosen = model === value.trim();
                const highlighted = index === active;
                return (
                  <StateLayerPressable key={model} nativeID={optionId(index)} layerColor={colors.onSurface} onPress={() => pick(model)}
                    role="option" aria-selected={chosen} tabIndex={-1}
                    style={[styles.option, highlighted && { backgroundColor: colors.secondaryContainer }]}>
                    <Text variant="bodyLarge" numberOfLines={1}
                      style={{ color: highlighted ? colors.onSecondaryContainer : chosen ? colors.primary : colors.onSurface, fontWeight: chosen ? '600' : undefined }}>{model}</Text>
                  </StateLayerPressable>
                );
              })}
            </View>
          </ScrollView>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Like the anchored menus: rounded surface, rows edge to edge so the highlight covers the whole row.
  list: { marginTop: spacing.xs, borderRadius: radius.control, overflow: 'hidden' },
  scroll: { maxHeight: 264 },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
});
