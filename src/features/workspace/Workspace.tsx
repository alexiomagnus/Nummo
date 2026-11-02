import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { expandOccurrences } from '../../domain/history';
import { todayInRome } from '../../domain/policy';
import { CategorySettings } from '../categories/CategorySettings';
import { useCategories } from '../categories/useCategories';
import { Dashboard } from '../dashboard/Dashboard';
import type { ExpenseStore } from '../expenses/expenseStore';
import { ExpenseForm } from '../expenses/ExpenseForm';
import { useLocalExpenses } from '../expenses/useLocalExpenses';
import { useRemoteExpenses } from '../expenses/useRemoteExpenses';
import { ExpenseList } from '../history/ExpenseList';

export function LocalWorkspace() {
  return <Workspace store={useLocalExpenses()} />;
}

// Key it by UID so a different account never sees the previous one's state.
export function RemoteWorkspace({ storageNote }: { storageNote: string }) {
  return <Workspace store={useRemoteExpenses(storageNote)} />;
}

function Workspace({ store }: { store: ExpenseStore }) {
  const [section, setSection] = useState('expense');
  const categoryState = useCategories();
  // Recomputed when expenses change; a page left open across midnight catches up on the next change.
  const occurrences = useMemo(() => expandOccurrences(store.expenses, todayInRome()), [store.expenses]);

  return (
    <>
      <SegmentedButtons value={section} onValueChange={setSection} buttons={[
        { value: 'expense', label: 'Nuova' },
        { value: 'list', label: 'Spese' },
        { value: 'dashboard', label: 'Dashboard' },
        { value: 'categories', label: 'Categorie' },
      ]} />
      {/* The form stays mounted so the draft survives a section change. */}
      <View style={{ display: section === 'expense' ? 'flex' : 'none' }}>
        <ExpenseForm categories={categoryState.categories} store={store} />
      </View>
      {section === 'list' && <ExpenseList occurrences={occurrences} categories={categoryState.categories}
        error={store.error} onDelete={store.remove} />}
      {section === 'dashboard' && <Dashboard occurrences={occurrences} categories={categoryState.categories} />}
      {section === 'categories' && <CategorySettings categories={categoryState.categories}
        error={categoryState.error} ready={categoryState.ready} onCreate={categoryState.createCategory}
        onDelete={categoryState.deleteCategory} onChangeIcon={categoryState.changeIcon}
        onRename={categoryState.rename} />}
    </>
  );
}
