import { useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, useColorScheme } from 'react-native';
import { IconButton, SegmentedButtons, MD3DarkTheme, MD3LightTheme, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ExpenseForm } from './src/features/expenses/ExpenseForm';
import { CategorySettings } from './src/features/categories/CategorySettings';
import { useCategories } from './src/features/categories/useCategories';
import { useExpenses } from './src/features/expenses/useExpenses';
import { ExpenseList } from './src/features/history/ExpenseList';
import { Dashboard } from './src/features/dashboard/Dashboard';
import { expandOccurrences } from './src/domain/history';
import { todayInRome } from './src/domain/policy';
import { ThemeIcon } from './src/components/ThemeIcon';

export default function App() {
  const [section, setSection] = useState('expense');
  const categoryState = useCategories();
  const expenseState = useExpenses();
  // Recomputed when expenses change; a page left open across midnight catches up on the next change.
  const occurrences = useMemo(() => expandOccurrences(expenseState.expenses, todayInRome()), [expenseState.expenses]);
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
              <View style={styles.brand} accessibilityRole="header" accessibilityLabel="Nummo">
                <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.logoLetter, { color: theme.colors.onPrimary }]}>N</Text>
                </View>
                <Text variant="displaySmall" style={[styles.brandName, { color: theme.colors.primary }]}>Nummo</Text>
              </View>
              <IconButton icon={({ size, color }) => <ThemeIcon dark={dark} size={size} color={color} />}
                onPress={() => setOverride(!dark)} accessibilityLabel={dark ? 'Attiva tema chiaro' : 'Attiva tema scuro'} />
            </View>
            <View style={styles.intro}>
              <Text variant="headlineSmall" style={styles.title}>Una spesa, pochi gesti.</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Importo, nome e ci sei.</Text>
            </View>
            <SegmentedButtons value={section} onValueChange={setSection} buttons={[
              { value: 'expense', label: 'Nuova' },
              { value: 'list', label: 'Spese' },
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'categories', label: 'Categorie' },
            ]} />
            <View style={{ display: section === 'expense' ? 'flex' : 'none' }}>
              <ExpenseForm categories={categoryState.categories} ready={expenseState.ready}
                error={expenseState.error} onSave={expenseState.save} />
            </View>
            {section === 'list' && <ExpenseList occurrences={occurrences} categories={categoryState.categories}
              error={expenseState.error} onDelete={expenseState.remove} />}
            {section === 'dashboard' && <Dashboard occurrences={occurrences} categories={categoryState.categories} />}
            {section === 'categories' && <CategorySettings categories={categoryState.categories}
              error={categoryState.error} ready={categoryState.ready} onCreate={categoryState.createCategory}
              onDelete={categoryState.deleteCategory} onChangeIcon={categoryState.changeIcon}
              onRename={categoryState.rename} />}
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
  intro: { gap: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 30, lineHeight: 34, fontWeight: '900' },
  brandName: { fontWeight: '800', letterSpacing: -1 },
  title: { fontWeight: '600' },
  footer: { textAlign: 'center', paddingBottom: 16 },
});
