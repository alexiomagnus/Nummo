import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { categoryNameError, type Category } from '../../domain/category';

type Props = {
  categories: readonly Category[];
  error: string | null;
  ready: boolean;
  onCreate: (name: string) => boolean;
};

export function CategorySettings({ categories, error, ready, onCreate }: Props) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
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
        {categories.map((category) => <Text key={category.id} variant="bodyLarge">{category.label}</Text>)}
        {ready && categories.length === 0 && <Text>Non hai ancora creato categorie.</Text>}
      </View>
      <Text variant="bodySmall">Le categorie sono conservate in questo browser. Non sono ancora sincronizzate con un account.</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 28, gap: 16 },
  list: { gap: 12 },
  button: { minHeight: 48 },
});
