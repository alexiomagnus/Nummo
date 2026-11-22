import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow } from '../../components/Button';
import { categoryNameError, maxCategoryNameLength, type Category, type CategoryIcon } from '../../domain/category';
import { clipToLength } from '../../domain/policy';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';
import { IconPicker } from './IconPicker';

type Props = {
  // Absent: creates a new category (empty name, no icon); present: edits it.
  record?: Category;
  categories: readonly Category[];
  ready: boolean;
  error: string | null;
  // Resolves true once saved (the dialog then closes); false keeps it open with `error`.
  onSave: (name: string, icon: CategoryIcon | null) => boolean | Promise<boolean>;
  close: () => void;
};


// Name and icon of a category, the only data a category has; same validation for creation and editing.
export function CategoryEditor({ record, categories, ready, error, onSave, close }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState(record?.label ?? '');
  const [icon, setIcon] = useState<CategoryIcon | null>(record?.icon ?? null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = busy || !ready;
  const save = async () => {
    if (blocked) return;
    const invalid = categoryNameError(name, record ? categories.filter((category) => category.id !== record.id) : categories);
    setValidationError(invalid);
    if (invalid) return;
    setBusy(true);
    try { if (await onSave(name, icon)) close(); }
    finally { setBusy(false); }
  };
  return <Portal>
    <Dialog visible onDismiss={() => { if (!busy) close(); }}>
      <Dialog.Title>{record ? t('Modifica categoria') : t('Nuova categoria')}</Dialog.Title>
      <Dialog.ScrollArea style={styles.area}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <TextInput outlineStyle={inputOutline} mode="outlined" label={t('Nome')} value={name}
            accessibilityLabel={record ? t('Nuovo nome per {p0}', { p0: record.label }) : t('Nome della nuova categoria, obbligatorio')}
            readOnly={blocked} aria-disabled={blocked} error={Boolean(validationError)}
            onChangeText={(next) => { setName(clipToLength(next, maxCategoryNameLength)); setValidationError(null); }} onSubmitEditing={() => void save()} />
          {validationError && <HelperText type="error" accessibilityRole="alert">{t(validationError)}</HelperText>}
          <Text variant="labelLarge">{t('Icona')}</Text>
          <IconPicker value={icon} onChange={setIcon} disabled={blocked} />
          {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions style={dialogActionsRow}>
        <CancelButton disabled={busy} onPress={close}>{t('Annulla')}</CancelButton>
        <ConfirmButton disabled={blocked} loading={busy} onPress={() => void save()}>{t('Salva')}</ConfirmButton>
      </Dialog.Actions>
    </Dialog>
  </Portal>;
}

const styles = StyleSheet.create({
  area: { minHeight: 0, paddingHorizontal: spacing.xl },
  content: { paddingVertical: spacing.sm, gap: spacing.md },
});
