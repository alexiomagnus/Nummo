import { useI18n } from '../i18n/I18nProvider';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';

type Notify = (message: string) => void;
const SnackbarContext = createContext<Notify>(() => {});
export const useSnackbar = (): Notify => useContext(SnackbarContext);

// 5 s (user's request, 22 November: 3 s since 17 November, then 4 s the same day; still within the 4–10 s of Material 3);
// «Chiudi» dismisses earlier.
const snackbarDuration = 5000;

// Transient notifications (M3 snackbar). `bottomOffset` keeps it above the navigation bar.
export function SnackbarProvider({ bottomOffset, onVisibleChange, children }: {
  bottomOffset: number; onVisibleChange?: (visible: boolean) => void; children: ReactNode;
}) {
  const { t } = useI18n();
  const [state, setState] = useState({ message: '', visible: false, id: 0 });
  const notify = useCallback<Notify>((message) => {
    setState((previous) => ({ message, visible: true, id: previous.id + 1 }));
    onVisibleChange?.(true);
  }, [onVisibleChange]);
  const dismiss = () => { setState((previous) => ({ ...previous, visible: false })); onVisibleChange?.(false); };
  const value = useMemo(() => notify, [notify]);
  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {/* In a portal remounted with each message: Paper stacks portals in mounting order, so a message sent while a dialog
          or sheet is open appears above its scrim instead of under it. Texts are translated here (portals lose contexts). */}
      <Portal key={state.id}>
        <Snackbar visible={state.visible} onDismiss={dismiss} duration={snackbarDuration}
          wrapperStyle={{ bottom: bottomOffset + spacing.sm, zIndex: 20 }}
          style={{ borderRadius: radius.control }} action={{ label: t("Chiudi"), onPress: dismiss }}>
          {t(state.message)}
        </Snackbar>
      </Portal>
    </SnackbarContext.Provider>
  );
}
