import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { useSizeClass } from '../../theme/useSizeClass';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { searchKey } from '../../domain/history';
import { categoryNameError, maxCategoryNameLength, type Category, type CategoryIcon, type CategoryUsage } from '../../domain/category';
import { clipToLength, searchPolicy } from '../../domain/policy';
import { DeleteAction } from '../../components/DeleteAction';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { decorativeIcon, leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';
import { IconPicker } from './IconPicker';
import { CategoryEditor } from './CategoryEditor';

type Props = {
  categories: readonly Category[];
  error: string | null;
  ready: boolean;
  notify: (message: string) => void;
  // «Ripristina le categorie predefinite»: adds back the defaults missing by name.
  onAddDefaults?: () => void;
  // Expenses and subscriptions per category; null while they are not loaded (deleting waits: a used category is never deleted).
  usage: ReadonlyMap<string, CategoryUsage> | null;
  canAddDefaults: boolean;
  // Resolves with the new category's ID (null when it was not saved).
  onCreate: (name: string, icon: CategoryIcon | null) => Promise<string | null>;
  onDelete: (id: string) => boolean | Promise<boolean>;
  onUpdate: (id: string, name: string, icon: CategoryIcon | null, expected: Category) => boolean | Promise<boolean>;
};

export function CategorySettings({ categories, error, ready, notify, onAddDefaults, canAddDefaults, usage, onCreate, onDelete, onUpdate }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  ready = ready && !busy;
  const [name, setName] = useState('');
  // A category used by expenses or subscriptions is not deleted (22 November, user's choice): the dialog says why, «Chiudi» only.
  const inUse = (id: string) => { const used = usage?.get(id); return Boolean(used && used.expenses + used.subscriptions > 0); };
  const blockedText = (id: string) => {
    const used = usage?.get(id) ?? { expenses: 0, subscriptions: 0 };
    const parts = [
      used.expenses > 0 ? (used.expenses === 1 ? t("1 spesa") : t("{p0} spese", { p0: used.expenses })) : '',
      used.subscriptions > 0 ? (used.subscriptions === 1 ? t("1 abbonamento") : t("{p0} abbonamenti", { p0: used.subscriptions })) : '',
    ].filter(Boolean);
    const users = parts.length === 2 ? t("{p0} e {p1}", { p0: parts[0] ?? "", p1: parts[1] ?? "" }) : parts[0] ?? '';
    return used.expenses + used.subscriptions === 1
      ? t("La usa {p0}. Per eliminarla, cambiane prima la categoria, oppure rinominala con la matita.", { p0: users })
      : t("La usano {p0}. Per eliminarla, cambia prima la loro categoria, oppure rinominala con la matita.", { p0: users });
  };
  const [icon, setIcon] = useState<CategoryIcon | null>(null);
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const create = async () => {
    const validationError = categoryNameError(name, categories);
    setNameError(validationError);
    if (!ready || validationError) return;
    setBusy(true);
    try { if (await onCreate(name, icon)) {
      setName('');
      setIcon(null);
      setChoosingIcon(false);
      notify("Categoria creata.");
    } } finally { setBusy(false); }
  };

  const shown = filter ? categories.filter((category) => searchKey(category.label).includes(searchKey(filter))) : categories;
  // Creation: name, icon, add on one row; on phones the name takes the whole first row and «Icona» and «Aggiungi» share the
  // next one in halves (user's request, 22 November: the name field was too narrow). The icon grid opens only on demand.
  const createForm = (
    <View style={styles.createPanel}>
      <View style={[styles.createRow, compact && styles.createRowCompact]}>
        <View style={[styles.nameField, compact && styles.nameFieldCompact]}>
          <TextInput outlineStyle={inputOutline} label={t("Nuova categoria")} accessibilityLabel={t("Nome della nuova categoria, obbligatorio")} mode="outlined" value={name}
            onChangeText={(value) => { setName(clipToLength(value, maxCategoryNameLength)); setNameError(null); }}
            onSubmitEditing={create} error={Boolean(nameError)} disabled={!ready}
            left={icon ? decorativeIcon(() => <CategoryGlyph icon={icon} size={24} />) : undefined} />
          {nameError && <HelperText type="error" accessibilityRole="alert">{t(nameError)}</HelperText>}
        </View>
        <View style={styles.createButtons}>
          <Button mode="outlined" disabled={!ready} onPress={() => setChoosingIcon(!choosingIcon)} aria-expanded={choosingIcon}
            icon={({ size, color }) => <SvgIcon shape={choosingIcon ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}
            accessibilityLabel={t("Icona della categoria, facoltativa")} style={[styles.create, compact && styles.createCompact]} contentStyle={styles.createContent}>{t("Icona")}</Button>
          <Button mode="contained" style={[styles.create, compact && styles.createCompact]} contentStyle={styles.createContent} onPress={create} disabled={!ready}>{t("Aggiungi")}</Button>
        </View>
      </View>
      {choosingIcon && <IconPicker value={icon} onChange={setIcon} disabled={!ready} />}
      {error && <HelperText type="error" accessibilityRole="alert">{t(error)}</HelperText>}
    </View>
  );

  return (
      <View style={styles.root}>
        {createForm}
        {categories.length > 8 && (
          <TextInput outlineStyle={inputOutline} label={t("Cerca categoria")} accessibilityLabel={t("Cerca categoria")} mode="outlined" value={filter} onChangeText={(value) => setFilter(clipToLength(value, searchPolicy.maxQueryLength))} autoCorrect={false}
            left={leadingIcon(iconShapes.search)}
            right={filter ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setFilter('')}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        )}
        {categories.length === 0 && ready && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessuna categoria.")}</Text>
          </View>
        )}
        <View role="list">
          {shown.map((category, index) => {
            const isEditing = editing?.id === category.id;
            return (
              <ListRow key={category.id} divider={index < shown.length - 1} icon={category.icon} title={category.label}
                trailing={<>
                  <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                    disabled={!ready} selected={isEditing} aria-haspopup="dialog" aria-expanded={isEditing} accessibilityLabel={t("Modifica {p0}", { p0: category.label })}
                    onPress={() => setEditing(category)} />
                  <DeleteAction name={category.label} disabled={usage === null} description={t("L’operazione non può essere annullata.")}
                    title={inUse(category.id) ? t("La categoria {p0} è in uso", { p0: category.label }) : t("Eliminare la categoria {p0}?", { p0: category.label })}
                    blocked={inUse(category.id) ? blockedText(category.id) : undefined}
                    onDelete={() => onDelete(category.id)} />
                </>} />
            );
          })}
        </View>
        {/* Always offered, with or without categories (user's request, 22 November): it adds back only the defaults missing by name. */}
        {/* Same look as «Ripristina predefiniti» of Settings (user's request, 22 November): pill, label in `secondary`. */}
        {onAddDefaults && <View style={compact ? undefined : styles.start}><Button mode="outlined" textColor={theme.colors.secondary} style={styles.restore} disabled={!canAddDefaults} onPress={onAddDefaults}
          icon={({ size, color }) => <SvgIcon shape={iconShapes.rotateCcw} size={size} color={color} />}>{t("Ripristina le categorie predefinite")}</Button></View>}
        {Boolean(filter) && shown.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessun risultato.")}</Text>}
        {editing && <CategoryEditor record={editing} categories={categories} ready={ready} error={error}
          onSave={async (nextName, nextIcon) => {
            const saved = await onUpdate(editing.id, nextName, nextIcon, editing);
            if (saved) notify("Categoria aggiornata.");
            return saved;
          }} close={() => setEditing(null)} />}
      </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  createPanel: { gap: spacing.md },
  createRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  // Phones: the name alone on the first row, at full width; «Icona» and «Aggiungi» below, in equal halves.
  createRowCompact: { flexDirection: 'column', alignItems: 'stretch', flexWrap: 'nowrap' },
  nameFieldCompact: { flexGrow: 0, flexBasis: 'auto' },
  nameField: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  createButtons: { flexDirection: 'row', gap: spacing.md },
  createCompact: { flex: 1, marginTop: 0 },
  // Paper's outlined field is 56 dp with 6 dp reserved above its box: buttons take the same 50 dp box and offset.
  create: { marginTop: 6, height: layout.fieldBoxHeight },
  createContent: { height: '100%' },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start', marginTop: spacing.sm },
  restore: { borderRadius: radius.pill },
});
