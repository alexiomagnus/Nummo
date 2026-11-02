import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { searchKey } from '../../domain/history';
import { categoryNameError, type Category, type CategoryIcon } from '../../domain/category';
import { Card } from '../../components/Card';
import { DeleteAction } from '../../components/DeleteAction';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { leadingIcon } from '../../components/FieldIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { shape, spacing } from '../../theme/tokens';
import { useSizeClass } from '../../theme/useSizeClass';
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

// Rounded tile showing a category icon (or a neutral placeholder).
function IconTile({ icon, size = 40 }: { icon: CategoryIcon | null; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: colors.surfaceVariant }]}>
      {icon ? <CategoryGlyph icon={icon} size={size - 16} /> : <SvgIcon shape={iconShapes.tag} size={size - 18} color={colors.onSurfaceVariant} />}
    </View>
  );
}

export function CategorySettings({ categories, usage, error, ready, notify, onAddDefaults, canAddDefaults, onCreate, onDelete, onChangeIcon, onRename }: Props) {
  const theme = useTheme();
  const size = useSizeClass();
  const wide = size === 'expanded';
  const compact = size === 'compact';
  const [creating, setCreating] = useState(false);
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
      setCreating(false);
      notify('Categoria creata. Puoi selezionarla in Nuova spesa.');
    } } finally { setBusy(false); }
  };

  const shown = filter ? categories.filter((category) => searchKey(category.label).includes(searchKey(filter))) : categories;
  const createCard = (
      <Card title="Nuova categoria" style={wide ? styles.side : undefined}>
        <View>
          <TextInput label="Nome categoria" accessibilityLabel="Nome categoria, obbligatorio" mode="outlined" value={name}
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
        {choosingIcon && <IconPicker value={icon} onChange={setIcon} />}
        {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
        <View style={styles.actions}>
          {!wide && <Button disabled={busy} onPress={() => { setCreating(false); setName(''); setNameError(null); }}>Annulla</Button>}
          <Button mode="contained" onPress={create} disabled={!ready} contentStyle={styles.button}>Crea categoria</Button>
        </View>
      </Card>
  );

  return (
    <View style={[styles.layout, wide && styles.row]}>
      {!wide && creating && createCard}
      <Card title="Le tue categorie" description={categories.length > 0 ? `${categories.length} ${categories.length === 1 ? 'categoria' : 'categorie'}` : undefined} style={wide ? styles.main : undefined}
        actions={!wide && !creating ? <Button mode="contained-tonal" contentStyle={styles.button} icon={({ size, color }) => <SvgIcon shape={iconShapes.plus} size={size} color={color} />} onPress={() => setCreating(true)}>Nuova</Button> : undefined}>
        {categories.length > 8 && (
          <TextInput label="Cerca categoria" accessibilityLabel="Cerca categoria" mode="outlined" value={filter} onChangeText={setFilter} autoCorrect={false}
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
          {shown.map((category) => {
            const used = usage[category.id] ?? 0;
            const isEditing = editing?.id === category.id;
            return (
              <View key={category.id} role="listitem" style={[styles.item, { borderColor: theme.colors.outlineVariant }]}>
                <View style={styles.row2}>
                  <IconTile icon={category.icon} />
                  <View style={styles.label}>
                    <Text variant="bodyLarge" numberOfLines={2}>{category.label}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{used === 0 ? 'Nessuna spesa' : used === 1 ? '1 spesa' : `${used} spese`}</Text>
                  </View>
                  <View style={styles.rowActions}>
                    {compact
                      ? <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />} style={styles.iconButton}
                          selected={isEditing} aria-expanded={isEditing} accessibilityLabel={`Modifica ${category.label}`}
                          onPress={() => setEditing(isEditing ? null : { id: category.id, name: category.label, error: null, original: category })} />
                      : <Button mode="text" contentStyle={styles.button} icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
                          aria-expanded={isEditing} accessibilityLabel={`Modifica ${category.label}`}
                          onPress={() => setEditing(isEditing ? null : { id: category.id, name: category.label, error: null, original: category })}>Modifica</Button>}
                    <DeleteAction labeled={!compact} name={category.label} title={`Eliminare la categoria “${category.label}”?`}
                      description={used > 0
                        ? `${used === 1 ? '1 spesa usa' : `${used} spese usano`} questa categoria: ${used === 1 ? 'resta registrata' : 'restano registrate'}, ma senza categoria. Nessuna spesa viene eliminata.`
                        : 'Nessuna spesa usa questa categoria. L’operazione non può essere annullata.'}
                      onDelete={() => onDelete(category.id)} />
                  </View>
                </View>
                {isEditing && editing && (
                  <View style={[styles.editor, { backgroundColor: theme.colors.elevation.level2 }]}>
                    <TextInput mode="outlined" label="Nome" value={editing.name} autoFocus
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
              </View>
            );
          })}
        </View>
        {filter && shown.length === 0 && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Nessuna categoria corrisponde alla ricerca.</Text>}
      </Card>
      {wide && createCard}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  side: { width: 340 },
  main: { flex: 1, minWidth: 0, maxWidth: 720 },
  tile: { borderRadius: shape.md, alignItems: 'center', justifyContent: 'center' },
  iconField: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  iconText: { flex: 1, minWidth: 80 },
  button: { minHeight: 48 },
  empty: { gap: spacing.sm },
  start: { alignSelf: 'flex-start', marginTop: spacing.sm },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm, gap: spacing.sm },
  row2: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  label: { flex: 1, minWidth: 0 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { margin: 0, width: 48, height: 48 },
  editor: { borderRadius: shape.md, padding: spacing.lg, gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
