import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Portal, TextInput } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { CancelButton, ConfirmButton, dialogActionsRow, dialogActionPair } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DeleteAction } from '../../components/DeleteAction';
import { SelectField } from '../../components/SelectField';
import type { Category } from '../../domain/category';
import { clipToLength, listPolicy } from '../../domain/policy';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { itemNameError, listNameError } from '../../domain/shoppingList';
import { existingCategory } from '../categories/preferredCategories';
import { NoFundAvatar } from '../funds/FundAvatar';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, spacing } from '../../theme/tokens';

// New list or rename: name and the category proposed when the list is registered.
export function ListEditor({ record, categories, defaultCategoryId = '', onSave, close }: {
  record?: SyncedList; categories: readonly Category[]; defaultCategoryId?: string;
  onSave: (name: string, categoryId: string | null) => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(record?.name ?? '');
  // A list may have no category («Nessuna categoria», chosen at registration). Editing starts from the list's own category
  // (none if it has none or it was deleted); a new list from the preferred one (Settings), otherwise none: never the first
  // category of the picker. Derived at render, so categories that arrive after the dialog opened still resolve.
  const [chosen, setCategoryId] = useState<string | undefined>(record ? record.category_id ?? '' : undefined);
  const categoryId = existingCategory(chosen ?? defaultCategoryId, categories) || null;
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const problem = listNameError(name);
    setError(problem);
    if (!problem && onSave(name, categoryId)) close();
  };
  const options = [{ value: '', label: t("Nessuna categoria"), icon: <NoFundAvatar size={24} /> },
    ...categories.map((c) => ({ value: c.id, label: c.label, icon: c.icon ? <CategoryGlyph icon={c.icon} size={20} /> : undefined }))];
  return <Portal><Dialog variant="sheet" visible onDismiss={close} style={styles.dialog} focusTextEntry={record ? false : 'touch'}>
    <Dialog.Title>{record ? t("Modifica lista") : t("Nuova lista")}</Dialog.Title>
    <Dialog.Content style={styles.content}>
      <View>
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nome della lista")} value={name} error={Boolean(error)}
          onChangeText={(value) => { setName(clipToLength(value, listPolicy.maxNameLength)); setError(null); }} onSubmitEditing={save} accessibilityLabel={t("Nome della lista, obbligatorio")} />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </View>
      <SelectField panel label={t("Categoria predefinita")} options={options} value={categoryId ?? ''} onChange={setCategoryId} />
    </Dialog.Content>
    <Dialog.Actions style={dialogActionsRow}>
      <CancelButton onPress={close}>{t("Annulla")}</CancelButton>
      <ConfirmButton onPress={save}>{record ? t("Salva") : t("Crea")}</ConfirmButton>
    </Dialog.Actions>
  </Dialog></Portal>;
}

// Rename or delete one product. Ticking happens in the row itself.
export function ItemEditor({ item, onSave, onDelete, close }: {
  item: SyncedListItem; onSave: (name: string) => boolean; onDelete: () => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const problem = itemNameError(name);
    setError(problem);
    if (!problem && onSave(name)) close();
  };
  return <Portal><Dialog variant="sheet" visible onDismiss={close} style={styles.dialog}>
    <Dialog.Title>{t("Modifica prodotto")}</Dialog.Title>
    <Dialog.Content style={styles.content}>
      <View>
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Prodotto")} value={name} error={Boolean(error)}
          onChangeText={(value) => { setName(clipToLength(value, listPolicy.maxItemLength)); setError(null); }} onSubmitEditing={save} accessibilityLabel={t("Nome del prodotto, obbligatorio")} />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </View>
    </Dialog.Content>
    <Dialog.Actions style={dialogActionsRow}>
      <View style={styles.grow}>
        <DeleteAction labeled="wide" name={item.name} title={t("Eliminare {p0} dalla lista?", { p0: item.name })} description=""
          onDelete={() => { const done = onDelete(); if (done) close(); return done; }} />
      </View>
      {/* Kept together so that, when the row wraps on narrow phones, the pair moves under Delete as one unit. */}
      <View style={dialogActionPair}>
        <CancelButton narrowOnPhone onPress={close}>{t("Annulla")}</CancelButton>
        <ConfirmButton narrowOnPhone onPress={save}>{t("Salva")}</ConfirmButton>
      </View>
    </Dialog.Actions>
  </Dialog></Portal>;
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 480 },
  content: { gap: spacing.md },
  // Natural width (not flexBasis 0), so a crowded row wraps instead of squeezing Delete under the pair.
  grow: { flexGrow: 1, alignItems: 'flex-start', marginRight: 0 },
});
