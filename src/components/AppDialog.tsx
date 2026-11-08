import type { ComponentProps } from 'react';
import { useWindowDimensions, type DimensionValue } from 'react-native';
import { Dialog, ThemeProvider, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dialogColor } from '../theme/theme';
import { layout, radius, spacing } from '../theme/tokens';

// Shared surface and viewport bounds for settings, editors, dates and confirmations.
// Matching `background` also makes outlined-field label notches blend with the modal.
function AppDialogRoot({ style, ...props }: ComponentProps<typeof Dialog>) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const background = dialogColor(theme.colors);
  const modalTheme = { ...theme, colors: { ...theme.colors, background } };
  const maxHeight = `calc(var(--nummo-viewport-height, 100dvh) - ${insets.top + insets.bottom + spacing.lg * 2}px)` as DimensionValue;
  return <ThemeProvider theme={modalTheme}>
    <Dialog {...props} style={[{
      maxWidth: layout.maxForm, borderRadius: radius.dialog,
      backgroundColor: background, borderWidth: 1, borderColor: theme.colors.outline,
    }, style, {
      width: Math.max(0, width - insets.left - insets.right - spacing.lg * 2),
      alignSelf: 'center', marginHorizontal: 0, marginVertical: spacing.lg, maxHeight,
    }]} />
  </ThemeProvider>;
}

export const AppDialog = Object.assign(AppDialogRoot, {
  Title: Dialog.Title, Content: Dialog.Content, ScrollArea: Dialog.ScrollArea,
  Actions: Dialog.Actions, Icon: Dialog.Icon,
});
