import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { SelectField } from '../../components/SelectField';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import type { Category } from '../../domain/category';
import type { TemplateRecord } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, radius, spacing, stateOpacity } from '../../theme/tokens';
import { NoFundAvatar } from '../funds/FundAvatar';

const noTemplate = 'none';

type Props = {
  templates: readonly TemplateRecord[];
  categories: readonly Category[];
  // The template the form was filled from, '' for none.
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// «Template» of Nuova spesa (user's request, 21 November): a selector shaped like a button, beside «Scansiona scontrino»
// (or in its place when the scan is off), so that the form no longer pushes «Salva» under the navigation on phones. Outline,
// icons and label in the primary colour, unlike the grey-outlined fields and the tonal scan button, so it reads as something
// else: a shortcut that fills the form (not the tertiary container: in mono mode it is the neutral surface variant, which
// looks disabled). The button never changes once a template is chosen (user's request, 21 November): always the template
// icon and «Template»; the choice shows in the filled fields and as the selected entry of the list. Same sheet (phones)
// and menu (from medium) as every other select.
export function TemplatePicker({ templates, categories, value, onChange, disabled, style }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const chosen = templates.find((item) => item.id === value);
  const options = [{ value: noTemplate, label: t("Nessun template"), icon: <NoFundAvatar size={24} /> },
    ...templates.map((item) => ({ value: item.id, label: item.description, icon: <TemplateGlyph template={item} categories={categories} size={20} /> }))];
  const color = colors.primary;
  return (
    <View style={style}>
      <SelectField label={t("Template")} options={options} value={chosen ? chosen.id : noTemplate} disabled={disabled} menuMinWidth={360}
        onChange={(id) => onChange(id === noTemplate ? '' : id)}
        triggerStyle={[styles.button, { borderColor: colors.primary }, disabled && { opacity: stateOpacity.disabled }]}
        trigger={(open) => <>
          <View style={styles.lead}><SvgIcon shape={iconShapes.template} size={20} color={color} /></View>
          <Text variant="labelLarge" numberOfLines={1} style={[styles.label, { color }]}>{t("Template")}</Text>
          {/* The arrow says it is a choice, not an action. */}
          <SvgIcon shape={open ? iconShapes.chevronUp : iconShapes.chevronDown} size={20} color={color} />
        </>} />
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
});
