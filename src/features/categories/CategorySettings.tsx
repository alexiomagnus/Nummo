import { useState } from 'react';
import { useSizeClass } from '../../theme/useSizeClass';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { searchKey } from '../../domain/history';
import { categoryNameError, type Category, type CategoryIcon } from '../../domain/category';
import { DeleteAction } from '../../components/DeleteAction';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { ListRow, listRowStyles } from '../../components/ListRow';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { inputOutline, layout, spacing } from '../../theme/tokens';
import { IconPicker } from './IconPicker';

type Props = {
  categories: readonly Category[];
  // Number of saved expenses per category ID (to explain what deleting a category does).
  usage: Readonly<Record<string, number>>;
  error: string | null;
  ready: boolean;
  notify: (message: string) => void;
  // Present only while there are no categories: adds the predefined set.
  onAddDefaults?: () => void;
  canAddDefaults: boolean;
  onCreate: (name: string, icon: CategoryIcon | null) => boolean | Promise<boolean>;
  onDelete: (id: string) => boolean | Promise<boolean>;
  onChangeIcon: (id: string, icon: CategoryIcon | null, expected: Category) => boolean | Promise<boolean>;
  onRename: (id: string, name: string, expected: Category) => boolean | Promise<boolean>;
};

type Editing = { id: string; name: string; error: string | null; original: Category };

export function CategorySettings({ categories, usage, error, ready, notify, onAddDefaults, canAddDefaults, onCreate, onDelete, onChangeIcon, onRename }: Props) {
  const theme = useTheme();
  const compact = useSizeClass() === 'compact';
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  ready = ready && !busy;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon | null>(null);
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const saveRename = async () => {
    if (!editing) return;
    const others = categories.filter((category) => category.id !== editing.id);
    const validationError = categoryNameError(editing.name, others);
    if (validationError) {
      setEditing({ ...editing, error: validationError });
      return;
    }
    if (!ready) return;
    setBusy(true);
    try { if (await onRename(editing.id, editing.name, editing.original)) { setEditing(null); notify('Categoria rinominata.'); } } finally { setBusy(false); }
  };
  const create = async () => {
    const validationError = categoryNameError(name, categories);
    setNameError(validationError);
    if (!ready || validationError) return;
    setBusy(true);
    try { if (await onCreate(name, icon)) {
      setName('');
      setIcon(null);
      setChoosingIcon(false);
      notify('Categoria creata.');
    } } finally { setBusy(false); }
  };

  const shown = filter ? categories.filter((category) => searchKey(category.label).includes(searchKey(filter))) : categories;
  // Creation: one row (name, icon, add); the icon grid opens only on demand.
  const createForm = (
    <View style={styles.createPanel}>
      <View style={styles.createRow}>
        <View style={styles.nameField}>
          <TextInput outlineStyle={inputOutline} label="Nuova categoria" accessibilityLabel="Nome della nuova categoria, obbligatorio" mode="outlined" value={name}
            onChangeText={(value) => { setName(value); setNameError(null); }}
            onSubmitEditing={create} error={Boolean(nameError)} disabled={!ready}
            left={icon ? <TextInput.Icon icon={() => <CategoryGlyph icon={icon} size={24} />} /> : undefined} />
          {nameError && <HelperText type="error" accessibilityRole="alert">{nameError}</HelperText>}
        </View>
        <Button mode="outlined" disabled={!ready} onPress={() => setChoosingIcon(!choosingIcon)} aria-expanded={choosingIcon}
          icon={({ size, color }) => <SvgIcon shape={choosingIcon ? iconShapes.chevronUp : iconShapes.chevronDown} size={size} color={color} />}
          accessibilityLabel="Icona della categoria, facoltativa" style={styles.create} contentStyle={styles.createContent}>Icona</Button>
        <Button mode="contained" style={styles.create} contentStyle={styles.createContent} onPress={create} disabled={!ready}>Aggiungi</Button>
      </View>
      {choosingIcon && <IconPicker value={icon} onChange={setIcon} />}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
    </View>
  );

  return (
      <View style={styles.root}>
        {createForm}
        {categories.length > 8 && (
          <TextInput outlineStyle={inputOutline} label="Cerca categoria" accessibilityLabel="Cerca categoria" mode="outlined" value={filter} onChangeText={setFilter} autoCorrect={false}
            left={leadingIcon(iconShapes.search)}
            right={filter ? <TextInput.Icon accessibilityLabel="Cancella ricerca" onPress={() => setFilter('')}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        )}
        {categories.length === 0 && ready && (
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessuna categoria.</Text>
            {onAddDefaults && <View style={styles.start}><Button mode="outlined" disabled={!canAddDefaults} onPress={onAddDefaults}>Aggiungi quelle predefinite</Button></View>}
          </View>
        )}
        <View role="list">
          {shown.map((category, index) => {
            const used = usage[category.id] ?? 0;
            const isEditing = editing?.id === category.id;
            return (
              <ListRow key={category.id} divider={index < shown.length - 1} icon={category.icon} title={category.label}
                subtitle={used === 0 ? 'Nessuna spesa' : used === 1 ? '1 spesa' : `${used} spese`}
                trailing={<>
                  <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                    selected={isEditing} aria-expanded={isEditing} accessibilityLabel={`Modifica ${category.label}`}
                    onPress={() => setEditing(isEditing ? null : { id: category.id, name: category.label, error: null, original: category })} />
                  <DeleteAction name={category.label} title={`Eliminare la categoria “${category.label}”?`}
                    description={used > 0
                      ? `${used === 1 ? '1 spesa usa' : `${used} spese usano`} questa categoria: ${used === 1 ? 'resta registrata' : 'restano registrate'}, ma senza categoria. Nessuna spesa viene eliminata.`
                      : 'Nessuna spesa usa questa categoria. L’operazione non può essere annullata.'}
                    onDelete={() => onDelete(category.id)} />
                </>}>
            {isEditing && editing && (
              <View style={styles.editor}>
                    <TextInput outlineStyle={inputOutline} mode="outlined" label="Nome" value={editing.name} autoFocus
                      accessibilityLabel={`Nuovo nome per ${category.label}`} error={Boolean(editing.error)} disabled={!ready}
                      onChangeText={(next) => setEditing({ ...editing, name: next, error: null })} onSubmitEditing={saveRename} />
                    {editing.error && <HelperText type="error" accessibilityRole="alert">{editing.error}</HelperText>}
                    <View style={styles.actions}>
                      <Button onPress={() => setEditing(null)}>Annulla</Button>
                      <Button disabled={!ready} mode="contained" onPress={saveRename}>Salva nome</Button>
                    </View>
                    <IconPicker value={category.icon}
                      onChange={async (next) => { if (ready && await onChangeIcon(category.id, next, editing.original)) { setEditing(null); notify('Icona aggiornata.'); } }} />
                  </View>
                )}
              </ListRow>
            );
          })}
        </View>
        {filter && shown.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessun risultato.</Text>}
      </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  createPanel: { gap: spacing.md },
  createRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  nameField: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
  // Paper's outlined field is 56 dp with 6 dp reserved above its box: buttons take the same 50 dp box and offset.
  create: { marginTop: 6, height: layout.fieldBoxHeight },
  createContent: { height: '100%' },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start', marginTop: spacing.sm },
  editor: { paddingBottom: spacing.md, gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
