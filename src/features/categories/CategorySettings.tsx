import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { categoryNameError, type Category, type CategoryIcon } from '../../domain/category';
import { DeleteAction } from '../../components/DeleteAction';
import { PixelIcon } from '../../components/PixelIcon';
import { SvgIcon, iconShapes } from '../../components/SvgIcon';
import { IconPicker } from './IconPicker';

type Props = {
  categories: readonly Category[];
  error: string | null;
  ready: boolean;
  onCreate: (name: string, icon: CategoryIcon | null) => boolean;
  onDelete: (id: string) => boolean;
  onChangeIcon: (id: string, icon: CategoryIcon | null) => boolean;
  onRename: (id: string, name: string) => boolean;
};

export function CategorySettings({ categories, error, ready, onCreate, onDelete, onChangeIcon, onRename }: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon | null>(null);
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [editingIconOf, setEditingIconOf] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string; error: string | null } | null>(null);
  const startRename = (category: Category) => {
    setRenaming({ id: category.id, name: category.label, error: null });
    setEditingIconOf(null);
    setCreated(false);
  };
  const saveRename = () => {
    if (!renaming) return;
    const others = categories.filter((category) => category.id !== renaming.id);
    const validationError = categoryNameError(renaming.name, others);
    if (validationError) {
      setRenaming({ ...renaming, error: validationError });
      return;
    }
    if (onRename(renaming.id, renaming.name)) setRenaming(null);
  };
  const create = () => {
    const validationError = categoryNameError(name, categories);
    setNameError(validationError);
    setCreated(false);
    if (!validationError && onCreate(name, icon)) {
      setName('');
      setIcon(null);
      setChoosingIcon(false);
      setCreated(true);
    }
  };

  return (
    <Surface elevation={1} style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">Le tue categorie</Text>
      <Text variant="bodyMedium">Crea le categorie che vuoi usare per le tue spese.</Text>
      <TextInput label="Nome categoria" accessibilityLabel="Nome categoria" mode="outlined" value={name}
        onChangeText={(value) => { setName(value); setNameError(null); setCreated(false); }}
        onSubmitEditing={create} error={Boolean(nameError)} disabled={!ready}
        left={icon ? <TextInput.Icon icon={() => <PixelIcon icon={icon} size={24} />} /> : undefined} />
      {nameError && <HelperText type="error" accessibilityRole="alert">{nameError}</HelperText>}
      {choosingIcon
        ? <IconPicker value={icon} onChange={setIcon} />
        : <Button onPress={() => setChoosingIcon(true)} disabled={!ready} style={styles.start}>Aggiungi un’icona (facoltativa)</Button>}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <Button mode="contained" onPress={create} disabled={!ready} contentStyle={styles.button}>Crea categoria</Button>
      {created && <Text accessibilityLiveRegion="polite">Categoria creata. Puoi selezionarla in Nuova spesa.</Text>}
      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category.id} style={styles.item}>
            <View style={styles.row}>
              <Pressable onPress={() => setEditingIconOf(editingIconOf === category.id ? null : category.id)}
                accessibilityRole="button"
                accessibilityLabel={category.icon ? `Cambia icona di ${category.label}` : `Aggiungi icona a ${category.label}`}
                style={[styles.iconSlot, {
                  borderColor: theme.colors.outlineVariant,
                  borderStyle: category.icon ? 'solid' : 'dashed',
                }]}>
                {category.icon
                  ? <PixelIcon icon={category.icon} size={28} />
                  : <Text style={{ color: theme.colors.onSurfaceVariant }}>+</Text>}
              </Pressable>
              {renaming?.id === category.id ? (
                <TextInput dense mode="outlined" value={renaming.name} autoFocus style={styles.label}
                  accessibilityLabel={`Nuovo nome per ${category.label}`} error={Boolean(renaming.error)}
                  onChangeText={(name) => setRenaming({ ...renaming, name, error: null })} onSubmitEditing={saveRename} />
              ) : (
                <Text variant="bodyLarge" style={styles.label}>{category.label}</Text>
              )}
              {renaming?.id === category.id ? (
                <View style={styles.actions}>
                  <Button onPress={() => setRenaming(null)}>Annulla</Button>
                  <Button mode="contained-tonal" onPress={saveRename}>Salva</Button>
                </View>
              ) : (
                <>
                  <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.pencil} size={size} color={color} />}
                    accessibilityLabel={`Rinomina ${category.label}`} onPress={() => startRename(category)} />
                  <DeleteAction name={category.label} onDelete={() => onDelete(category.id)} />
                </>
              )}
            </View>
            {renaming?.id === category.id && renaming.error && (
              <HelperText type="error" accessibilityRole="alert">{renaming.error}</HelperText>
            )}
            {editingIconOf === category.id && (
              <IconPicker value={category.icon}
                onChange={(next) => { if (onChangeIcon(category.id, next)) setEditingIconOf(null); }} />
            )}
          </View>
        ))}
        {ready && categories.length === 0 && <Text>Non hai ancora creato categorie.</Text>}
      </View>
      <Text variant="bodySmall">Le categorie sono conservate in questo browser. Non sono ancora sincronizzate con un account.</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 28, gap: 16 },
  start: { alignSelf: 'flex-start' },
  list: { gap: 8 },
  item: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  iconSlot: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 4 },
  button: { minHeight: 48 },
});
