import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Portal } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow, dialogActionPair } from '../../components/Button';
import { DeleteAction } from '../../components/DeleteAction';
import type { Category } from '../../domain/category';
import type { SyncedTemplate } from '../../domain/firestore';
import type { RankedMerchant } from '../../domain/merchant';
import type { TemplateData } from '../../domain/template';
import { useI18n } from '../../i18n/I18nProvider';
import { spacing } from '../../theme/tokens';
import type { FundChoice } from '../funds/FundField';
import { TemplateFields, useTemplateForm } from './TemplateForm';

// Edit dialog of one template, with its deletion (confirmed) on the left like in the expense editor.
export function TemplateEditor({ template, categories, fundChoices, merchants, error, onSave, onDelete, close }: {
  template: SyncedTemplate; categories: readonly Category[]; fundChoices: readonly FundChoice[]; merchants: readonly RankedMerchant[]; error: string | null;
  onSave: (data: TemplateData) => boolean; onDelete: () => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const form = useTemplateForm({ categories, fundChoices, merchants, initial: template, onSubmit: (data) => { const saved = onSave(data); if (saved) close(); return saved; } });
  return <Portal>
    <Dialog visible onDismiss={() => { if (!deleting) close(); }}>
      <Dialog.Title>{t("Modifica template")}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TemplateFields form={form} dense />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </ScrollView></Dialog.ScrollArea>
      {/* Buttons as direct children of Dialog.Actions (it clones each one): never a Fragment. */}
      <Dialog.Actions style={dialogActionsRow}>
        <View style={styles.remove}><DeleteAction labeled="wide" name={template.description} onOpenChange={setDeleting}
          onDelete={() => { const removed = onDelete(); if (removed) close(); return removed; }} /></View>
        <View style={dialogActionPair}>
          <CancelButton disabled={deleting} onPress={close}>{t("Annulla")}</CancelButton>
          <ConfirmButton disabled={deleting} onPress={form.submit}>{t("Salva")}</ConfirmButton>
        </View>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm },
  // Natural width (not flexBasis 0): on a narrow phone the row wraps, Elimina above, instead of overlapping «Annulla».
  remove: { flexGrow: 1, alignItems: 'flex-start', marginRight: 0 },
});
