import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, useTheme } from 'react-native-paper';
import { Button, DangerButton } from '../../components/Button';
import { DeleteDialog } from '../../components/DeleteAction';
import { useSnackbar } from '../../components/SnackbarHost';
import { ListGroup, RowBody, RowDivider, StatusRow, ToggleRow } from '../../components/ActionList';
import { IconTile, listRowStyles } from '../../components/ListRow';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { useHaptics } from '../../components/Haptics';
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
  const [confirmAll, setConfirmAll] = useState(false);
  const notify = useSnackbar();
  const form = useTemplateForm({ categories, fundChoices, merchants, onSubmit: remote.create });
  const labels = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const full = remote.templates.length >= templatePolicy.maxTemplates;
  return (
    <View style={styles.root}>
      {/* The grouped rows of «Lista scontrini», «Info» and «Archiviazione e backup» (user's request, 27 November: Impostazioni,
          Notifiche and Templates redone like them). */}
      <ListGroup icon={iconShapes.template} label={t("Template")}>
        <ToggleRow icon={iconShapes.template} title={t("Usa i template")} value={enabled} onChange={onToggle}
          subtitle={enabled ? t("In Nuova spesa compare il pulsante Template.") : t("In Nuova spesa non compare il pulsante Template.")} />
      </ListGroup>
      {/* Off: greyed out (M3 disabled opacity) and unreachable, never hidden (user's request, 21 November), like the AI card. */}
      <View style={[styles.sections, !enabled && { opacity: stateOpacity.disabled }]} aria-disabled={!enabled} {...{ inert: enabled ? undefined : true }}>
        <ListGroup icon={iconShapes.plus} label={t("Nuovo template")}>
          <RowBody>
            {full ? <Text variant="bodyMedium" style={muted}>{t("Hai raggiunto il limite di {p0} template: eliminane uno per aggiungerne altri.", { p0: templatePolicy.maxTemplates })}</Text> : <>
              <TemplateFields form={form} disabled={!remote.ready || !enabled} />
              <Button mode="contained" disabled={!remote.ready || !enabled} onPress={() => { haptic(); form.submit(); }} contentStyle={styles.createContent} labelStyle={styles.createLabel} style={styles.create}>{t("Crea")}</Button>
            </>}
            {remote.error && <HelperText type="error" accessibilityRole="alert">{t(remote.error)}</HelperText>}
          </RowBody>
        </ListGroup>
        <ListGroup icon={iconShapes.list} label={remote.templates.length > 0 ? t("I tuoi template ({p0})", { p0: remote.templates.length }) : t("I tuoi template")}>
          {remote.templates.length === 0
            ? <StatusRow icon={iconShapes.template} tone="secondary" title={remote.ready ? t("Nessun template.") : t("Caricamento…")} />
            : <View role="list">{remote.templates.map((template, index) => {
              const category = labels.get(template.category_id);
              const details = [category?.label ?? t("Categoria eliminata"), template.fund_id ? fundNames.get(template.fund_id) ?? t("Fondo eliminato") : null,
                template.merchant].filter(Boolean).join(' · ');
              return <View key={template.id} role="listitem">
                {index > 0 && <RowDivider />}
                <View style={styles.templateRow}>
                  <IconTile icon={category?.icon ?? null} size={40} />
                  <View style={styles.templateText}>
                    <Text variant="titleMedium" numberOfLines={1}>{template.description}</Text>
                    <Text variant="bodyMedium" numberOfLines={1} style={muted}>{details}</Text>
                  </View>
                  {template.amount_minor !== null && <Text variant="titleMedium" style={listRowStyles.amount}>{formatAmount(template.amount_minor)}</Text>}
                  {/* Only the pencil opens the editor, as in Liste (user's request, 24 November: the whole row was one button). */}
                  <IconButton style={styles.editButton} accessibilityLabel={t("Modifica {p0}", { p0: template.description })}
                    onPress={() => setEditing(template)} icon={pencilIcon} />
                </View>
              </View>;
            })}</View>}
          {/* Every template at once (user's request, 22 November); Nuova spesa and the saved expenses are not touched. */}
          {remote.templates.length > 0 && <><RowDivider />
            <RowBody><DangerButton disabled={!remote.ready || !enabled} style={styles.removeAll} onPress={() => setConfirmAll(true)}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />}>{t("Elimina tutti i template")}</DangerButton></RowBody></>}
        </ListGroup>
      </View>
      <DeleteDialog visible={confirmAll} name={t("tutti i template")}
        title={remote.templates.length === 1 ? t("Eliminare 1 template?") : t("Eliminare {p0} template?", { p0: remote.templates.length })}
        description={t("Le spese già salvate non cambiano. L’operazione non può essere annullata.")}
        onDismiss={() => setConfirmAll(false)}
        onConfirm={() => {
          const removed = remote.removeAll(remote.templates);
          if (removed > 0) notify(removed === 1 ? t("1 template eliminato.") : t("{p0} template eliminati.", { p0: removed }));
          return true;
        }} />
      {editing && <TemplateEditor template={editing} categories={categories} fundChoices={fundChoices} merchants={merchants} error={remote.error}
        onSave={(data) => remote.update(editing, data)} onDelete={() => remote.remove(editing)} close={() => setEditing(null)} />}
    </View>
  );
}

const pencilIcon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />;

const styles = StyleSheet.create({
  root: { width: '100%', gap: layout.sectionGap },
  sections: { width: '100%', gap: layout.sectionGap },
  // Like «Salva» of Nuova spesa (user's request, 21 November): full width at every size, pill-shaped.
  create: { alignSelf: 'stretch', borderRadius: radius.pill },
  createContent: { minHeight: layout.controlHeight },
  createLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 72, paddingVertical: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.sm },
  templateText: { flex: 1, minWidth: 0, gap: 2 },
  // The whole width of the group, as the other pill actions of the page.
  removeAll: { alignSelf: 'stretch' },
  // Same as the pencil of the products in Liste.
  editButton: { margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 8 },
});
