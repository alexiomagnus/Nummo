import { createContext, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { layout, radius } from '../theme/tokens';

// Inside the Actions of a screen or sheet (AppDialog `screen`/`sheet`): every action is a full-width pill, as «Salva» of Nuova
// spesa (user's request, 23 November: «tutti i tasti elimina, salva e crea devono essere in questo modo»). Read by ConfirmButton
// and DeleteAction; a module of its own so that Button and AppDialog do not import each other.
export const ScreenActionsContext = createContext(false);
export const useScreenActions = () => useContext(ScreenActionsContext);

export const screenActionStyles = StyleSheet.create({
  button: { alignSelf: 'stretch', borderRadius: radius.pill, minWidth: 0 },
  // Only the shape, for an outlined action that keeps its own width («Annulla» halves, rows of the scan).
  pill: { borderRadius: radius.pill },
  content: { minHeight: layout.controlHeight },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
