import { useState } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme } from 'react-native';
import { IconButton, SegmentedButtons, MD3DarkTheme, MD3LightTheme, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ExpenseForm } from './src/features/expenses/ExpenseForm';
import { CategorySettings } from './src/features/categories/CategorySettings';
import { useCategories } from './src/features/categories/useCategories';
import { RecurringExpenses } from './src/features/recurring/RecurringExpenses';
import { useRecurringExpenses } from './src/features/recurring/useRecurringExpenses';
import { ThemeIcon } from './src/components/ThemeIcon';

export default function App() {
  const [section, setSection] = useState('expense');
  const categoryState = useCategories();
  const recurringState = useRecurringExpenses();
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const dark = override ?? systemScheme === 'dark';
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const theme = {
    ...base,
    roundness: 5,
    colors: {
      ...base.colors,
      primary: dark ? '#A9D5BB' : '#32634B',
      onPrimary: dark ? '#103826' : '#FFFFFF',
      primaryContainer: dark ? '#294E3B' : '#C6ECD3',
      onPrimaryContainer: dark ? '#C6ECD3' : '#103826',
      background: dark ? '#121713' : '#F7F9F2',
      surface: dark ? '#1A211C' : '#FFFFFF',
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.header}>
              <Text variant="headlineMedium" accessibilityRole="header" style={[styles.brand, { color: theme.colors.primary }]}>Nummo</Text>
              <IconButton icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
                onPress={() => setOverride(!dark)} accessibilityLabel={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'} />
            </View>
            <View style={styles.intro}>
              <Text variant="headlineLarge" accessibilityRole="header" style={styles.title}>Una spesa, pochi gesti.</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Importo, categoria e ci sei.</Text>
            </View>
            <SegmentedButtons value={section} onValueChange={setSection} buttons={[
              { value: 'expense', label: 'Nuova spesa' },
              { value: 'recurring', label: 'Ricorrenti' },
              { value: 'categories', label: 'Categorie' },
            ]} />
            <View style={{ display: section === 'expense' ? 'flex' : 'none' }}>
              <ExpenseForm categories={categoryState.categories} />
            </View>
            <View style={{ display: section === 'recurring' ? 'flex' : 'none' }}>
              <RecurringExpenses items={recurringState.items} error={recurringState.error}
                ready={recurringState.ready} onCreate={recurringState.create} onDelete={recurringState.remove} />
            </View>
            {section === 'categories' && <CategorySettings categories={categoryState.categories}
              error={categoryState.error} ready={categoryState.ready} onCreate={categoryState.createCategory}
              onDelete={categoryState.deleteCategory} />}
            <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>Il tuo registro, una spesa alla volta.</Text>
          </View>
        </ScrollView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20 },
  container: { width: '100%', maxWidth: 580, alignSelf: 'center', gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  intro: { gap: 8, paddingTop: 8 },
  brand: { fontWeight: '700' },
  title: { fontWeight: '600' },
  footer: { textAlign: 'center', paddingBottom: 16 },
});
