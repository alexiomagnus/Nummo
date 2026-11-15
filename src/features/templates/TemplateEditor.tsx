import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import type { Category } from '../../domain/category';
import type { SyncedTemplate } from '../../domain/firestore';
import type { TemplateData } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import type { FundChoice } from '../funds/FundField';
import { TemplateFields, useTemplateForm } from './TemplateForm';

// Edit dialog of one template, with its deletion (confirmed) on the left like in the expense editor.
export function TemplateEditor({ template, categories, fundChoices, error, onSave, onDelete, close }: {
  template: SyncedTemplate; categories: readonly Category[]; fundChoices: readonly FundChoice[]; error: string | null;
  onSave: (data: TemplateData) => boolean; onDelete: () => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const form = useTemplateForm({ categories, fundChoices, initial: template, onSubmit: (data) => { const saved = onSave(data); if (saved) close(); return saved; } });
  return <Portal>
    <Dialog visible onDismiss={() => { if (!deleting) close(); }}>
      <Dialog.Title>{t("Modifica template")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TemplateFields form={form} />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </ScrollView></Dialog.ScrollArea>
      <Dialog.Actions style={styles.actions}>
        <View style={styles.remove}><DeleteAction labeled name={template.description} onOpenChange={setDeleting}
          onDelete={() => { const removed = onDelete(); if (removed) close(); return removed; }} /></View>
        <Button disabled={deleting} style={styles.action} onPress={close}>{t("Annulla")}</Button>
        <Button mode="contained" disabled={deleting} style={styles.action} onPress={form.submit}>{t("Salva")}</Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl, borderTopWidth: 0, borderBottomWidth: 0 },
  content: { paddingVertical: spacing.sm },
  actions: { flexWrap: 'wrap', gap: spacing.xs },
  remove: { flex: 1, alignItems: 'flex-start' },
  action: { minWidth: 88 },
});
