import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useHaptics } from '../../components/Haptics';
import { SwitchRow } from '../../components/SwitchRow';
import type { Category } from '../../domain/category';
import type { SyncedTemplate } from '../../domain/firestore';
import type { RankedMerchant } from '../../domain/merchant';
import { templatePolicy } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, radius, spacing, stateOpacity } from '../../theme/tokens';
import type { FundChoice } from '../funds/FundField';
import { TemplateEditor } from './TemplateEditor';
import { TemplateFields, useTemplateForm } from './TemplateForm';
import type { RemoteTemplates } from './useRemoteTemplates';

type Props = {
  remote: RemoteTemplates;
  categories: readonly Category[];
  // Active funds (a template may use these).
  fundChoices: readonly FundChoice[];
  // Funds by ID, archived ones included, to name the fund of an older template.
  fundNames: ReadonlyMap<string, string>;
  merchants: readonly RankedMerchant[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

// Page of the account menu (below Categories): the switch that turns templates on (off by default), a short explanation,
// the form of a new template and the list of saved ones, each editable and deletable. Templates fill «Nuova spesa» and
// nothing else: they are never spending by themselves. Off, the saved templates are kept and this page shows them greyed
// out; only the picker of Nuova spesa is hidden.
// Removed on 16 November 2026, reintroduced on 21 November on request (now with «Esercente»).
export function TemplatesPage({ remote, categories, fundChoices, fundNames, merchants, enabled, onToggle }: Props) {
  const { t, formatAmount } = useI18n();
  const { colors } = useTheme();
  const haptic = useHaptics();
  const muted = { color: colors.onSurfaceVariant };
  const [editing, setEditing] = useState<SyncedTemplate | null>(null);
  const form = useTemplateForm({ categories, fundChoices, merchants, onSubmit: remote.create });
  const labels = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const full = remote.templates.length >= templatePolicy.maxTemplates;
  return (
    <View style={styles.root}>
      <Card>
        <Text variant="bodyMedium" style={muted}>{t("Un template è una spesa già pronta, semplifica la gestione delle spese.")}</Text>
        <SwitchRow label={t("Usa i template")} value={enabled} onChange={onToggle}
          supporting={enabled ? t("In Nuova spesa compare il pulsante Template.") : t("In Nuova spesa non compare il pulsante Template.")} />
      </Card>
      {/* Off: greyed out (M3 disabled opacity) and unreachable, never hidden (user's request, 21 November), like the AI card. */}
      <View style={[styles.sections, !enabled && { opacity: stateOpacity.disabled }]} aria-disabled={!enabled} {...{ inert: enabled ? undefined : true }}>
        <Card title={t("Nuovo template")}>
          {full ? <Text variant="bodyMedium" style={muted}>{t("Hai raggiunto il limite di {p0} template: eliminane uno per aggiungerne altri.", { p0: templatePolicy.maxTemplates })}</Text> : <>
            <TemplateFields form={form} disabled={!remote.ready || !enabled} />
            <View style={styles.actions}><Button mode="contained" disabled={!remote.ready || !enabled} onPress={() => { haptic(); form.submit(); }} contentStyle={styles.createContent} labelStyle={styles.createLabel} style={styles.create}>{t("Crea")}</Button></View>
          </>}
          {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
        </Card>
        <Card title={remote.templates.length > 0 ? t("I tuoi template ({p0})", { p0: remote.templates.length }) : t("I tuoi template")}>
          {remote.templates.length === 0
            ? <Text variant="bodyMedium" style={muted}>{remote.ready ? t("Nessun template.") : t("Caricamento…")}</Text>
            : <View role="list">{remote.templates.map((template, index) => {
              const category = labels.get(template.category_id);
              const details = [category?.label ?? t("Categoria eliminata"), template.fund_id ? fundNames.get(template.fund_id) ?? t("Fondo eliminato") : null,
                template.merchant].filter(Boolean).join(' · ');
              return <ListRow key={template.id} icon={category?.icon ?? null} title={template.description} subtitle={details} divider={index < remote.templates.length - 1}
                pressLabel={t("Modifica {p0}", { p0: template.description })} onPress={() => setEditing(template)}
                trailing={<View style={styles.trailing}>
                  {template.amount_minor !== null && <Text variant="titleMedium" style={listRowStyles.amount}>{formatAmount(template.amount_minor)}</Text>}
                  {/* The whole row opens the editor; the pencil only tells that it can be edited (user's request, 21 November); 28 dp in the 44 box (24 looked small, user's request of 21 November). */}
                  <View aria-hidden style={[styles.edit, { borderColor: colors.outline }]}><SvgIcon shape={iconShapes.pencil} size={28} color={colors.onSurfaceVariant} /></View>
                </View>} />;
            })}</View>}
        </Card>
      </View>
      {editing && <TemplateEditor template={editing} categories={categories} fundChoices={fundChoices} merchants={merchants} error={remote.error}
        onSave={(data) => remote.update(editing, data)} onDelete={() => remote.remove(editing)} close={() => setEditing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  sections: { width: '100%', gap: layout.sectionGap },
  // As tall as «Salva» in Nuova spesa, aligned to the right.
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  // Like «Salva» of Nuova spesa (user's request, 21 November): full width at every size, pill-shaped.
  create: { flexGrow: 1, borderRadius: radius.pill },
  createContent: { minHeight: layout.controlHeight },
  createLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  edit: { width: 44, height: 44, borderRadius: radius.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
