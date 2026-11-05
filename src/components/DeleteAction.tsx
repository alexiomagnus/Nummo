import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { Button } from './Button';
import { layout, radius, spacing } from '../theme/tokens';
import { useSizeClass } from '../theme/useSizeClass';
import { SvgIcon, iconShapes } from './SvgIcon';

type DialogProps = {
  visible: boolean;
  name: string;
  // Overrides the default «Eliminare {name}?».
  title?: string;
  description?: string;
  onDismiss: () => void;
  onConfirm: () => boolean | Promise<boolean>;
};

// Confirmation for every irreversible deletion (M3 basic dialog): small error-coloured icon,
// left-aligned title and consequences, actions at the bottom right (full width on phones).
// Escape cancels; the safe action («Annulla») takes the initial focus.
export function DeleteDialog({ visible, name, title, description, onDismiss, onConfirm }: DialogProps) {
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onDismiss(); };
    document.addEventListener('keydown', onKey);
    const timer = setTimeout(() => document.querySelector<HTMLElement>('[role=alertdialog] [role=button], [role=alertdialog] button')?.focus(), 80);
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(timer); };
  }, [visible, busy, onDismiss]);
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => { if (!busy) onDismiss(); }} style={{ width: '92%', maxWidth: 400, alignSelf: 'center', borderRadius: radius.dialog }}>
        <View role="alertdialog" aria-label={title ?? `Eliminare ${name}?`}>
          <View style={styles.header}>
            <SvgIcon shape={iconShapes.trash} size={24} color={colors.error} />
            <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>{title ?? `Eliminare ${name}?`}</Text>
          </View>
          {(description ?? 'x') !== '' && <Text variant="bodyMedium" style={[styles.body, { color: colors.onSurfaceVariant }]}>{description ?? 'L’operazione non può essere annullata.'}</Text>}
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Button mode="outlined" disabled={busy} contentStyle={styles.button} onPress={onDismiss}>Annulla</Button>
            <Button mode="contained" buttonColor={colors.error} textColor={colors.onError} disabled={busy} loading={busy} contentStyle={styles.button}
              accessibilityLabel={`Conferma eliminazione di ${name}`}
              onPress={async () => { setBusy(true); try { if (await onConfirm()) onDismiss(); } finally { setBusy(false); } }}>Elimina</Button>
          </View>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  title: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  button: { paddingHorizontal: spacing.xs, minHeight: 40 },
});

// Trash icon first, explicit confirmation dialog second. The action seen when the dialog
// was opened is the one confirmed, even if the parent re-renders with newer data meanwhile.
export function DeleteAction({ name, title, description, onDelete, labeled }: { name: string; title?: string; description?: string; onDelete: () => boolean | Promise<boolean>; labeled?: boolean }) {
  const action = useRef(onDelete);
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const request = () => { action.current = onDelete; setOpen(true); };
  const icon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />;
  return <>
    {labeled
      ? <Button mode="text" icon={icon} textColor={colors.error} accessibilityLabel={`Elimina ${name}`} onPress={request}>Elimina</Button>
      : <IconButton icon={icon} style={{ margin: 0, width: layout.minTouch, height: layout.minTouch }} accessibilityLabel={`Elimina ${name}`} onPress={request} />}
    <DeleteDialog visible={open} name={name} title={title} description={description} onDismiss={() => setOpen(false)} onConfirm={() => action.current()} />
  </>;
}
