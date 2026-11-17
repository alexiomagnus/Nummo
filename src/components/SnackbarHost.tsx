import { useI18n } from '../i18n/I18nProvider';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Snackbar } from 'react-native-paper';
import { radius, spacing } from '../theme/tokens';

type Notify = (message: string) => void;
const SnackbarContext = createContext<Notify>(() => {});
export const useSnackbar = (): Notify => useContext(SnackbarContext);

// Short messages: 3 s (5 s felt too long, user's request of 17 November); «Chiudi» dismisses earlier.
const snackbarDuration = 3000;

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
      <Snackbar key={state.id} visible={state.visible} onDismiss={dismiss} duration={snackbarDuration}
        wrapperStyle={{ bottom: bottomOffset + spacing.sm, zIndex: 20 }}
        style={{ borderRadius: radius.control }} action={{ label: t("Chiudi"), onPress: dismiss }}>
        {t(state.message)}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
