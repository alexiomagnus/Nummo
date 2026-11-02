import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { categoryNameError, type Category } from '../../domain/category';

type Props = {
  categories: readonly Category[];
  error: string | null;
  ready: boolean;
  onCreate: (name: string) => boolean;
  onDelete: (id: string) => boolean;
};

export function CategorySettings({ categories, error, ready, onCreate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const create = () => {
    const validationError = categoryNameError(name, categories);
    setNameError(validationError);
    setCreated(false);
    if (!validationError && onCreate(name)) {
      setName('');
      setCreated(true);
    }
  };

  return (
    <Surface elevation={1} style={styles.section}>
      <Text variant="titleLarge" accessibilityRole="header">Le tue categorie</Text>
      <Text variant="bodyMedium">Crea le categorie che vuoi usare per le tue spese.</Text>
      <TextInput label="Nome categoria" accessibilityLabel="Nome categoria" mode="outlined" value={name}
        onChangeText={(value) => { setName(value); setNameError(null); setCreated(false); }}
        onSubmitEditing={create} error={Boolean(nameError)} disabled={!ready} />
      {nameError && <HelperText type="error" accessibilityRole="alert">{nameError}</HelperText>}
      {error && <HelperText type="error" accessibilityRole="alert">{error}</HelperText>}
      <Button mode="contained" onPress={create} disabled={!ready} contentStyle={styles.button}>Crea categoria</Button>
      {created && <Text accessibilityLiveRegion="polite">Categoria creata. Puoi selezionarla in Nuova spesa.</Text>}
      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text variant="bodyLarge" style={styles.label}>{category.label}</Text>
            {pendingDelete === category.id ? (
              <View style={styles.actions}>
                <Button onPress={() => setPendingDelete(null)}>Annulla</Button>
                <Button mode="contained-tonal" accessibilityLabel={`Conferma eliminazione di ${category.label}`}
                  onPress={() => { if (onDelete(category.id)) setPendingDelete(null); }}>Elimina</Button>
              </View>
            ) : (
              <Button accessibilityLabel={`Elimina ${category.label}`}
                onPress={() => { setPendingDelete(category.id); setCreated(false); }}>Elimina</Button>
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
  list: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  label: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: 4 },
  button: { minHeight: 48 },
});
