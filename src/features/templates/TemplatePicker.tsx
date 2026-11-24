import { useState } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog } from '../../components/AppDialog';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { StateLayerPressable } from '../../components/StateLayerPressable';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { TemplateRecord } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, radius, spacing, stateOpacity } from '../../theme/tokens';
import { NoFundAvatar } from '../funds/FundAvatar';

type Props = {
  templates: readonly TemplateRecord[];
  categories: readonly Category[];
  // The template the form was filled from, '' for none.
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// «Template» of Nuova spesa (user's request, 21 November): a button beside «Scansiona scontrino» (or in its place when the
// scan is off), so that the form no longer pushes «Salva» under the navigation on phones. Outline, icons and label in the
// primary colour, unlike the grey-outlined fields and the tonal scan button, so it reads as something else: a shortcut that
// fills the form (not the tertiary container: in mono mode it is the neutral surface variant, which looks disabled). The
// button never changes once a template is chosen (user's request, 21 November): always the template icon and «Template»;
// the choice shows in the filled fields and as the selected entry of the list.
// The choices open in a screen grown from the button, like «Scansiona scontrino» (user's request, 24 November: same
// animation and behaviour, starting from the Template button, in Template's colours: the selected row and its check in the
// primary container/primary), instead of the sheet (phones) and menu (from medium) of the other selects.
export function TemplatePicker({ templates, categories, value, onChange, disabled, style }: Props) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const color = colors.primary;
  const chosen = templates.find((item) => item.id === value);
  const choose = (id: string) => { setOpen(false); onChange(id); };
  const rows = [{ id: '', label: t("Nessun template"), icon: <NoFundAvatar size={24} />, amount: null as number | null },
    ...templates.map((item) => ({ id: item.id, label: item.description, icon: <TemplateGlyph template={item} categories={categories} size={24} />, amount: item.amount_minor }))];
  return (
    <View style={style}>
      <StateLayerPressable layerColor={colors.onSurface} radius={radius.button} disabled={disabled} onPress={() => setOpen(true)}
        style={[styles.button, { borderColor: color }, disabled && { opacity: stateOpacity.disabled }]}
        accessibilityRole="button" aria-haspopup="dialog" aria-disabled={disabled}
        accessibilityLabel={`${t("Template")}${chosen ? `: ${chosen.description}` : ''}`}>
        <View style={styles.lead}><SvgIcon shape={iconShapes.template} size={20} color={color} /></View>
        <Text variant="labelLarge" numberOfLines={1} style={[styles.label, { color }]}>{t("Template")}</Text>
        {/* The arrow says it is a choice, not an action. */}
        <SvgIcon shape={iconShapes.chevronDown} size={20} color={color} />
      </StateLayerPressable>
      {open && <Portal><AppDialog visible detents opensHalf onDismiss={() => setOpen(false)}>
        <AppDialog.Title>{t("Template")}</AppDialog.Title>
        <AppDialog.ScrollArea style={styles.area}><ScrollView>
          <View role="list" accessibilityLabel={t("Template")} style={styles.list}>
            {rows.map((row) => {
              const selected = row.id === (chosen?.id ?? '');
              return <StateLayerPressable key={row.id || 'none'} layerColor={colors.onSurface} radius={radius.button} onPress={() => choose(row.id)}
                accessibilityRole="button" aria-current={selected || undefined} accessibilityLabel={`${row.label}${selected ? t(", selezionata") : ''}`}
                style={[styles.row, selected && { backgroundColor: colors.primaryContainer }]}>
                <View style={styles.icon}>{row.icon}</View>
                <Text variant="bodyLarge" numberOfLines={1} style={[styles.name, selected && { color: colors.onPrimaryContainer }]}>{row.label}</Text>
                {row.amount !== null && <Text variant="titleMedium" style={{ color: selected ? colors.onPrimaryContainer : colors.onSurface }}>{formatAmount(row.amount)}</Text>}
                <View style={styles.check}>{selected && <SvgIcon shape={iconShapes.check} size={20} color={colors.onPrimaryContainer} />}</View>
              </StateLayerPressable>;
            })}
          </View>
        </ScrollView></AppDialog.ScrollArea>
        {/* No «Chiudi»: Back closes it, like the other screens of choice. */}
      </AppDialog></Portal>}
    </View>
  );
}

// Category icon of a template in the list; none when its category no longer exists.
function TemplateGlyph({ template, categories, size }: { template: TemplateRecord; categories: readonly Category[]; size: number }) {
  const icon = categories.find((category) => category.id === template.category_id)?.icon;
  return icon ? <CategoryGlyph icon={icon} size={size} /> : null;
}

const styles = StyleSheet.create({
  // As tall as «Scansiona scontrino», with the corner of every button.
  button: { minHeight: layout.minTouch, borderRadius: radius.button, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  lead: { minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flexShrink: 1 },
  area: { minHeight: 0 },
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, borderRadius: radius.button },
  icon: { width: 32, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, minWidth: 0 },
  check: { width: 20 },
});
