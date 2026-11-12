import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from './AppDialog';
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
  // Overrides the confirm button text («Elimina») for destructive actions that are not plain deletions.
  confirmLabel?: string;
  onDismiss: () => void;
  onConfirm: () => boolean | Promise<boolean>;
};

// Confirmation for every irreversible deletion (M3 basic dialog): small error-coloured icon,
// left-aligned title and consequences, actions at the bottom right (full width on phones).
// Escape cancels; the safe action («Annulla») takes the initial focus.
export function DeleteDialog({ visible, name, title, description, confirmLabel, onDismiss, onConfirm }: DialogProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [busy, setBusy] = useState(false);
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => { if (!busy) onDismiss(); }} style={{ maxWidth: 400 }}>
        <View role="alertdialog" aria-label={title ?? t("Eliminare {p0}?", { p0: name })} style={styles.container}>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <SvgIcon shape={iconShapes.trash} size={24} color={colors.error} />
                <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>{title ?? t("Eliminare {p0}?", { p0: name })}</Text>
              </View>
              {(description ?? 'x') !== '' && <Text variant="bodyMedium" style={[styles.body, { color: colors.onSurfaceVariant }]}>{description ?? t("L’operazione non può essere annullata.")}</Text>}
            </ScrollView>
          </Dialog.ScrollArea>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Button mode="outlined" disabled={busy} contentStyle={styles.button} onPress={onDismiss}>{t("Annulla")}</Button>
            <Button mode="contained" buttonColor={colors.error} textColor={colors.onError} disabled={busy} loading={busy} contentStyle={styles.button}
              accessibilityLabel={confirmLabel ?? t("Conferma eliminazione di {p0}", { p0: name })}
              onPress={async () => { setBusy(true); try { if (await onConfirm()) onDismiss(); } finally { setBusy(false); } }}>{confirmLabel ?? t("Elimina")}</Button>
          </View>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0, borderTopWidth: 0, borderBottomWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  title: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  button: { paddingHorizontal: spacing.xs, minHeight: 40 },
});

// Trash icon first, explicit confirmation dialog second. The action seen when the dialog
// was opened is the one confirmed, even if the parent re-renders with newer data meanwhile.
export function DeleteAction({ name, title, description, onDelete, labeled, disabled, onOpenChange }: { name: string; title?: string; description?: string; onDelete: () => boolean | Promise<boolean>; labeled?: boolean; disabled?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { t } = useI18n();
  const action = useRef(onDelete);
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const request = () => { action.current = onDelete; setOpen(true); onOpenChange?.(true); };
  const dismiss = () => { setOpen(false); onOpenChange?.(false); };
  const icon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />;
  return <>
    {labeled
      ? <Button mode="text" disabled={disabled} icon={icon} textColor={colors.error} accessibilityLabel={t("Elimina {p0}", { p0: name })} onPress={request}>{t("Elimina")}</Button>
      : <IconButton disabled={disabled} icon={icon} style={{ margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: 8 }} accessibilityLabel={t("Elimina {p0}", { p0: name })} onPress={request} />}
    <DeleteDialog visible={open} name={name} title={title} description={description} onDismiss={dismiss} onConfirm={() => action.current()} />
  </>;
}
