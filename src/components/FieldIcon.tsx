import { TextInput } from 'react-native-paper';
import { SvgIcon } from './SvgIcon';

// Decorative leading icon for a text field. Paper renders TextInput.Icon as a button, so it is
// taken out of the tab order and the accessibility tree (it does nothing when pressed).
export function leadingIcon(shape: string) {
  return <TextInput.Icon icon={({ size, color }) => <SvgIcon shape={shape} size={size} color={color} />}
    tabIndex={-1} aria-hidden importantForAccessibility="no" />;
}
