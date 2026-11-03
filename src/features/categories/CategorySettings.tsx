import { useState } from 'react';
import { useSizeClass } from '../../theme/useSizeClass';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { Button } from '../../components/Button';
import { searchKey } from '../../domain/history';
import { categoryNameError, type Category, type CategoryIcon } from '../../domain/category';
import { Card } from '../../components/Card';
import { DeleteAction } from '../../components/DeleteAction';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { IconTile, ListRow, listRowStyles } from '../../components/ListRow';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { inputOutline, layout, radius, spacing } from '../../theme/tokens';
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
      notify('Categoria creata. Puoi selezionarla in Nuova spesa.');
    } } finally { setBusy(false); }
  };

  const shown = filter ? categories.filter((category) => searchKey(category.label).includes(searchKey(filter))) : categories;
  // Creation form: sits directly on the page card, no extra container.
  const createForm = (
    <View style={styles.createPanel}>
      <Text variant="titleMedium" accessibilityRole="header" aria-level={3}>Nuova categoria</Text>
      <View style={styles.createRow}>
        <View style={styles.nameField}>
          <TextInput outlineStyle={inputOutline} label="Nome categoria" accessibilityLabel="Nome categoria, obbligatorio" mode="outlined" value={name}
            onChangeText={(value) => { setName(value); setNameError(null); }}
            onSubmitEditing={create} error={Boolean(nameError)} disabled={!ready}
            left={icon ? <TextInput.Icon icon={() => <CategoryGlyph icon={icon} size={24} />} /> : undefined} />
          {nameError && <HelperText type="error" accessibilityRole="alert">{nameError}</HelperText>}
        </View>
        <View style={styles.iconField}>
          <IconTile icon={icon} size={48} />
          <View style={styles.iconText}>
            <Text variant="titleSmall">Icona</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{icon ? 'Selezionata' : 'Facoltativa'}</Text>
          </View>
          {icon && <Button disabled={!ready} onPress={() => setIcon(null)}>Rimuovi</Button>}
          <Button mode="outlined" disabled={!ready} onPress={() => setChoosingIcon(!choosingIcon)}
            aria-expanded={choosingIcon}>{choosingIcon ? 'Chiudi' : icon ? 'Cambia' : 'Scegli'}</Button>
        </View>
        <Button mode="contained" style={styles.create} onPress={create} disabled={!ready}>Crea categoria</Button>
      </View>
      {choosingIcon && <IconPicker value={icon} onChange={setIcon} />}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
    </View>
  );

  return (
      <Card>
        {createForm}
        <View style={styles.listHeader}>
          <Text variant="titleMedium" accessibilityRole="header" aria-level={2}>Le tue categorie</Text>
          {categories.length > 0 && <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{`${categories.length} ${categories.length === 1 ? 'categoria' : 'categorie'}`}</Text>}
        </View>
        {categories.length > 8 && (
          <TextInput outlineStyle={inputOutline} label="Cerca categoria" accessibilityLabel="Cerca categoria" mode="outlined" value={filter} onChangeText={setFilter} autoCorrect={false}
            left={leadingIcon(iconShapes.search)}
            right={filter ? <TextInput.Icon accessibilityLabel="Cancella ricerca" onPress={() => setFilter('')}
              icon={({ size, color }) => <SvgIcon shape={iconShapes.close} size={size} color={color} />} /> : undefined} />
        )}
        {categories.length === 0 && ready && (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Non hai ancora creato categorie.</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Creane una dal modulo oppure parti dalle categorie predefinite.</Text>
            {onAddDefaults && <View style={styles.start}><Button mode="outlined" disabled={!canAddDefaults} onPress={onAddDefaults}>Aggiungi categorie predefinite</Button></View>}
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
                  {compact
                    ? <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={listRowStyles.iconButton}
                        selected={isEditing} aria-expanded={isEditing} accessibilityLabel={`Modifica ${category.label}`}
                        onPress={() => setEditing(isEditing ? null : { id: category.id, name: category.label, error: null, original: category })} />
                    : <Button mode="text" icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
                        aria-expanded={isEditing} accessibilityLabel={`Modifica ${category.label}`}
                        onPress={() => setEditing(isEditing ? null : { id: category.id, name: category.label, error: null, original: category })}>Modifica</Button>}
                  <DeleteAction labeled={!compact} name={category.label} title={`Eliminare la categoria “${category.label}”?`}
                    description={used > 0
                      ? `${used === 1 ? '1 spesa usa' : `${used} spese usano`} questa categoria: ${used === 1 ? 'resta registrata' : 'restano registrate'}, ma senza categoria. Nessuna spesa viene eliminata.`
                      : 'Nessuna spesa usa questa categoria. L’operazione non può essere annullata.'}
                    onDelete={() => onDelete(category.id)} />
                </>}>
            {isEditing && editing && (
              <View style={[styles.editor, { backgroundColor: theme.colors.elevation.level2 }]}>
                    <TextInput outlineStyle={inputOutline} mode="outlined" label="Nome" value={editing.name} autoFocus
                      accessibilityLabel={`Nuovo nome per ${category.label}`} error={Boolean(editing.error)} disabled={!ready}
                      onChangeText={(next) => setEditing({ ...editing, name: next, error: null })} onSubmitEditing={saveRename} />
                    {editing.error && <HelperText type="error" accessibilityRole="alert">{editing.error}</HelperText>}
                    <View style={styles.actions}>
                      <Button onPress={() => setEditing(null)}>Annulla</Button>
                      <Button disabled={!ready} mode="contained" onPress={saveRename}>Salva nome</Button>
                    </View>
                    <Text variant="titleSmall">Icona</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Toccandone una la applichi subito; toccando quella attiva la rimuovi.</Text>
                    <IconPicker value={category.icon}
                      onChange={async (next) => { if (ready && await onChangeIcon(category.id, next, editing.original)) { setEditing(null); notify('Icona aggiornata.'); } }} />
                  </View>
                )}
              </ListRow>
            );
          })}
        </View>
        {filter && shown.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessuna categoria corrisponde alla ricerca.</Text>}
      </Card>
  );
}

const styles = StyleSheet.create({
  listHeader: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  createPanel: { gap: spacing.md },
  createRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.lg },
  nameField: { flexGrow: 2, flexBasis: 260, minWidth: 0 },
  create: { alignSelf: 'flex-start', marginTop: 4 },
  iconField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', flexGrow: 1, flexBasis: 260, minHeight: layout.controlHeight },
  iconText: { flex: 1, minWidth: 80 },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start', marginTop: spacing.sm },
  editor: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
