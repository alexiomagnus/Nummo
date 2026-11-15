import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Text, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { SwitchRow } from '../../components/SwitchRow';
import type { Category } from '../../domain/category';
import type { SyncedTemplate } from '../../domain/firestore';
import { templatePolicy } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { layout, spacing } from '../../theme/tokens';
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
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

// Page of the account menu (below Categories): the switch that turns templates on (off by default), a short explanation,
// the form of a new template and the list of saved ones, each editable and deletable. Templates fill «Nuova spesa» and
// nothing else: they are never spending by themselves. Off, the saved templates are kept, only the picker is hidden.
export function TemplatesPage({ remote, categories, fundChoices, fundNames, enabled, onToggle }: Props) {
  const { t, formatAmount, formatDate } = useI18n();
  const { colors } = useTheme();
  const muted = { color: colors.onSurfaceVariant };
  const [editing, setEditing] = useState<SyncedTemplate | null>(null);
  const form = useTemplateForm({ categories, fundChoices, onSubmit: remote.create });
  const labels = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const full = remote.templates.length >= templatePolicy.maxTemplates;
  return (
    <View style={styles.root}>
      <Card>
        <Text variant="bodyMedium" style={muted}>{t("Un template è una spesa già pronta, semplifica la gestione delle spese.")}</Text>
        <SwitchRow label={t("Usa i template")} value={enabled} onChange={onToggle}
          supporting={enabled ? t("In Nuova spesa compare il campo Template.") : t("Spenti: in Nuova spesa il campo Template non compare. I template salvati restano.")} />
      </Card>
      {enabled && <>
        <Card title={t("Nuovo template")}>
          {full ? <Text variant="bodyMedium" style={muted}>{t("Hai raggiunto il limite di {p0} template: eliminane uno per aggiungerne altri.", { p0: templatePolicy.maxTemplates })}</Text> : <>
            <TemplateFields form={form} disabled={!remote.ready} />
            <View style={styles.actions}><Button mode="contained" disabled={!remote.ready} onPress={form.submit} contentStyle={styles.createContent} labelStyle={styles.createLabel} style={styles.create}>{t("Crea")}</Button></View>
          </>}
          {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
        </Card>
        <Card title={remote.templates.length > 0 ? t("I tuoi template ({p0})", { p0: remote.templates.length }) : t("I tuoi template")}>
          {remote.templates.length === 0
            ? <Text variant="bodyMedium" style={muted}>{remote.ready ? t("Nessun template.") : t("Caricamento…")}</Text>
            : <View role="list">{remote.templates.map((template, index) => {
              const category = labels.get(template.category_id);
              const details = [category?.label ?? t("Categoria eliminata"), template.fund_id ? fundNames.get(template.fund_id) ?? t("Fondo eliminato") : null,
                formatDate(template.date)].filter(Boolean).join(' · ');
              return <ListRow key={template.id} icon={category?.icon ?? null} title={template.description} subtitle={details} divider={index < remote.templates.length - 1}
                pressLabel={t("Modifica {p0}", { p0: template.description })} onPress={() => setEditing(template)}
                trailing={template.amount_minor !== null ? <Text variant="titleMedium" style={listRowStyles.amount}>{formatAmount(template.amount_minor)}</Text> : undefined} />;
            })}</View>}
        </Card>
      </>}
      {editing && <TemplateEditor template={editing} categories={categories} fundChoices={fundChoices} error={remote.error}
        onSave={(data) => remote.update(editing, data)} onDelete={() => remote.remove(editing)} close={() => setEditing(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  // As tall as «Salva» in Nuova spesa, aligned to the right.
  // 8 more than the card's gap: the selects above reserve a little room under themselves, so this matches the space between inputs.
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  create: { minWidth: 140 },
  createContent: { minHeight: layout.controlHeight },
  createLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
