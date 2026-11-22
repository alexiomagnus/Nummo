import { useI18n } from '../i18n/I18nProvider';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { AppDialog as Dialog } from './AppDialog';
import { Button, CancelButton, ConfirmButton } from './Button';
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
  // Extra content under the description (e.g. the offer of a backup before deleting).
  children?: ReactNode;
  // The deletion is not allowed: `blocked` says why, and «Chiudi» is the only action (a category still in use).
  blocked?: string;
};

// Confirmation for every irreversible deletion (M3 basic dialog): small error-coloured icon,
// left-aligned title and consequences, actions at the bottom right (full width on phones).
// Escape cancels; the safe action («Annulla») takes the initial focus.
export function DeleteDialog({ visible, name, title, description, confirmLabel, onDismiss, onConfirm, children, blocked }: DialogProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const compact = useSizeClass() === 'compact';
  const [busy, setBusy] = useState(false);
  // With extra content (the backup offered before deleting, full width), «Annulla» and the confirmation share the whole row in
  // equal halves from medium too, lined up with it (user's request, 22 November); phones stack them at full width anyway.
  const halves = children && !compact ? styles.half : undefined;
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
              {blocked ? <Text variant="bodyMedium" style={[styles.body, { color: colors.onSurfaceVariant }]}>{blocked}</Text>
                : (description ?? 'x') !== '' && <Text variant="bodyMedium" style={[styles.body, { color: colors.onSurfaceVariant }]}>{description ?? t("L’operazione non può essere annullata.")}</Text>}
              {children && <View style={styles.extra}>{children}</View>}
            </ScrollView>
          </Dialog.ScrollArea>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            {blocked ? <CancelButton onPress={onDismiss}>{t("Chiudi")}</CancelButton> : <>
            <CancelButton disabled={busy} onPress={onDismiss} style={halves}>{t("Annulla")}</CancelButton>
            <ConfirmButton buttonColor={colors.error} textColor={colors.onError} disabled={busy} loading={busy} style={halves}
              accessibilityLabel={confirmLabel ?? t("Conferma eliminazione di {p0}", { p0: name })}
              onPress={async () => { setBusy(true); try { if (await onConfirm()) onDismiss(); } finally { setBusy(false); } }}>{confirmLabel ?? t("Elimina")}</ConfirmButton>
            </>}
          </View>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 1, minHeight: 0 },
  scrollArea: { minHeight: 0, paddingHorizontal: 0, marginBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  title: { flex: 1 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  extra: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, alignItems: 'stretch' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  actionsCompact: { flexDirection: 'column', alignItems: 'stretch' },
  half: { flex: 1, minWidth: 0 },
});

// Trash icon first, explicit confirmation dialog second. The action seen when the dialog
// was opened is the one confirmed, even if the parent re-renders with newer data meanwhile.
// `labeled="wide"`: «Elimina» with its label from medium, only the outlined trash icon (error colour, 48×48) on phones, where the
// label next to «Annulla»/«Salva» did not fit and the row wrapped, leaving Elimina alone on a line (user's choice, 21 November).
export function DeleteAction({ name, title, description, blocked, onDelete, labeled: labeledProp, mode = 'text', disabled, onOpenChange }: { name: string; title?: string; description?: string; blocked?: string; onDelete: () => boolean | Promise<boolean>; labeled?: boolean | 'wide'; mode?: 'text' | 'outlined'; disabled?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { t } = useI18n();
  const phone = useSizeClass() === 'compact';
  const labeled = labeledProp === 'wide' ? !phone : labeledProp;
  const danger = labeledProp === 'wide';
  const action = useRef(onDelete);
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const request = () => { action.current = onDelete; setOpen(true); onOpenChange?.(true); };
  const dismiss = () => { setOpen(false); onOpenChange?.(false); };
  const icon = ({ size, color }: { size: number; color: string }) => <SvgIcon shape={iconShapes.trash} size={size} color={color} />;
  return <>
    {labeled
      ? <Button mode={mode} disabled={disabled} icon={icon} textColor={colors.error} accessibilityLabel={t("Elimina {p0}", { p0: name })} onPress={request}>{t("Elimina")}</Button>
      // In the edit dialogs (phones) the trash is outlined like «Annulla» beside it (same 48 dp height and radius), the outline in
      // the icon's own error red (user's request, 21 November).
      : <IconButton disabled={disabled} icon={icon} mode={danger ? 'outlined' : undefined} iconColor={danger ? colors.error : undefined}
        style={{ margin: 0, width: layout.minTouch, height: layout.minTouch, borderRadius: danger ? radius.button : 4, ...(danger ? { borderColor: colors.error } : {}) }} accessibilityLabel={t("Elimina {p0}", { p0: name })} onPress={request} />}
    <DeleteDialog visible={open} name={name} title={title} description={description} blocked={blocked} onDismiss={dismiss} onConfirm={() => action.current()} />
  </>;
}
