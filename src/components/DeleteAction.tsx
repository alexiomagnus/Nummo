import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { SvgIcon, iconShapes } from './SvgIcon';

// Trash icon first, explicit confirmation second: deletion cannot be undone.
export function DeleteAction({ name, onDelete }: { name: string; onDelete: () => boolean | Promise<boolean> }) {
  const action = useRef(onDelete);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <IconButton icon={({ size, color }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />}
      accessibilityLabel={`Elimina ${name}`} onPress={() => { action.current = onDelete; setConfirming(true); }} />;
  }
  return (
    <View style={styles.actions}>
      <Button disabled={busy} onPress={() => setConfirming(false)}>Annulla</Button>
      <Button mode="contained-tonal" accessibilityLabel={`Conferma eliminazione di ${name}`}
        disabled={busy} loading={busy} onPress={async () => { setBusy(true); try { if (await action.current()) setConfirming(false); } finally { setBusy(false); } }}>Elimina</Button>
    </View>
  );
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: 4 } });
