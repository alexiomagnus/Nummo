import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Portal, TextInput } from 'react-native-paper';
import { AppDialog as Dialog } from '../../components/AppDialog';
import { Button } from '../../components/Button';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { DeleteAction } from '../../components/DeleteAction';
import { SelectField } from '../../components/SelectField';
import type { Category } from '../../domain/category';
import type { SyncedList, SyncedListItem } from '../../domain/firestore';
import { itemNameError, listNameError } from '../../domain/shoppingList';
import { existingCategory } from '../categories/preferredCategories';
import { useI18n } from '../../i18n/I18nProvider';
import { inputOutline, layout, spacing } from '../../theme/tokens';

// New list or rename: name and the category proposed when the list is registered.
export function ListEditor({ record, categories, defaultCategoryId = '', onSave, close }: {
  record?: SyncedList; categories: readonly Category[]; defaultCategoryId?: string;
  onSave: (name: string, categoryId: string | null) => boolean; close: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(record?.name ?? '');
  // No «no category» choice: the list's own category when it still exists, otherwise the preferred one (Settings), otherwise
  // the first one of the picker. Derived at render, so categories that arrive after the dialog opened (or a deleted one)
  // still leave a valid selection.
  const [chosen, setCategoryId] = useState<string | null>(record?.category_id ?? null);
  const categoryId = existingCategory(chosen ?? '', categories) || existingCategory(defaultCategoryId, categories) || (categories[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const problem = listNameError(name);
    setError(problem);
    // Without any category yet the list is saved without one, as before.
    if (!problem && onSave(name, categoryId)) close();
  };
  const options = categories.map((c) => ({ value: c.id, label: c.label, icon: c.icon ? <CategoryGlyph icon={c.icon} size={20} /> : undefined }));
  return <Portal><Dialog visible onDismiss={close} style={styles.dialog}>
    <Dialog.Title>{record ? t("Modifica lista") : t("Nuova lista")}</Dialog.Title>
    <Dialog.Content style={styles.content}>
      <View>
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Nome della lista")} value={name} error={Boolean(error)}
          onChangeText={(value) => { setName(value); setError(null); }} onSubmitEditing={save} accessibilityLabel={t("Nome della lista, obbligatorio")} />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </View>
      <SelectField label={t("Categoria predefinita")} options={options} value={categoryId ?? ''} onChange={setCategoryId} />
    </Dialog.Content>
    <Dialog.Actions>
      <Button style={styles.listAction} onPress={close}>{t("Annulla")}</Button>
      <Button style={styles.listAction} mode="contained" onPress={save}>{record ? t("Salva") : t("Crea")}</Button>
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
  return <Portal><Dialog visible onDismiss={close} style={styles.dialog}>
    <Dialog.Title>{t("Modifica prodotto")}</Dialog.Title>
    <Dialog.Content style={styles.content}>
      <View>
        <TextInput outlineStyle={inputOutline} mode="outlined" label={t("Prodotto")} value={name} error={Boolean(error)}
          onChangeText={(value) => { setName(value); setError(null); }} onSubmitEditing={save} accessibilityLabel={t("Nome del prodotto, obbligatorio")} />
        {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
      </View>
    </Dialog.Content>
    <Dialog.Actions style={styles.actions}>
      <View style={styles.grow}>
        <DeleteAction labeled name={item.name} title={t("Eliminare {p0} dalla lista?", { p0: item.name })} description=""
          onDelete={() => { const done = onDelete(); if (done) close(); return done; }} />
      </View>
      {/* Kept together so that, when the row wraps on narrow phones, the pair moves under Delete as one unit. */}
      <View style={styles.pair}>
        <Button compact style={styles.pairAction} onPress={close}>{t("Annulla")}</Button>
        <Button compact style={styles.pairAction} mode="contained" onPress={save}>{t("Salva")}</Button>
      </View>
    </Dialog.Actions>
  </Dialog></Portal>;
}

const styles = StyleSheet.create({
  dialog: { maxWidth: 480 },
  content: { gap: spacing.md },
  listAction: { minWidth: layout.minTouch * 2 },
  actions: { flexWrap: 'wrap', gap: spacing.xs },
  // Natural width (not flexBasis 0), so a crowded row wraps instead of squeezing Delete under the pair.
  grow: { flexGrow: 1, alignItems: 'flex-start' },
  pair: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
  pairAction: { minWidth: layout.minTouch * 2, flexShrink: 1 },
});
