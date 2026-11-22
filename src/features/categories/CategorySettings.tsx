import { useI18n } from '../../i18n/I18nProvider';
import { useState } from 'react';
import { useSizeClass } from '../../theme/useSizeClass';
import { StyleSheet, View } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { searchKey } from '../../domain/history';
import { categoryNameError, maxCategoryNameLength, type Category, type CategoryIcon } from '../../domain/category';
import { clipToLength } from '../../domain/policy';
import { DeleteAction } from '../../components/DeleteAction';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { decorativeIcon, leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { inputOutline, layout, spacing } from '../../theme/tokens';
import { IconPicker } from './IconPicker';
import { CategoryEditor } from './CategoryEditor';

type Props = {
  categories: readonly Category[];
  error: string | null;
  ready: boolean;
  notify: (message: string) => void;
  // Present only while there are no categories: adds the predefined set.
  onAddDefaults?: () => void;
  canAddDefaults: boolean;
  // Resolves with the new category's ID (null when it was not saved).
  onCreate: (name: string, icon: CategoryIcon | null) => Promise<string | null>;
  onDelete: (id: string) => boolean | Promise<boolean>;
  onUpdate: (id: string, name: string, icon: CategoryIcon | null, expected: Category) => boolean | Promise<boolean>;
};

export function CategorySettings({ categories, error, ready, notify, onAddDefaults, canAddDefaults, onCreate, onDelete, onUpdate }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  ready = ready && !busy;
  const [name, setName] = useState('');
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
          <TextInput outlineStyle={inputOutline} label={t("Cerca categoria")} accessibilityLabel={t("Cerca categoria")} mode="outlined" value={filter} onChangeText={setFilter} autoCorrect={false}
            left={leadingIcon(iconShapes.search)}
            right={filter ? <TextInput.Icon accessibilityLabel={t("Cancella ricerca")} onPress={() => setFilter('')}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        )}
        {categories.length === 0 && ready && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("Nessuna categoria.")}</Text>
            {onAddDefaults && <View style={styles.start}><Button mode="outlined" disabled={!canAddDefaults} onPress={onAddDefaults}>{t("Aggiungi quelle predefinite")}</Button></View>}
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
                  <DeleteAction name={category.label} title={t("Eliminare la categoria {p0}?", { p0: category.label })} description={t("L’operazione non può essere annullata.")}
                    onDelete={() => onDelete(category.id)} />
                </>} />
            );
          })}
        </View>
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
});
