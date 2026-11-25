import { useTheme } from 'react-native-paper';

// Indeterminate circular progress drawn by the browser: a CSS animation on an SVG arc, run by the compositor.
// Paper's ActivityIndicator animates in JavaScript on the web (no native driver): during the start of the app it
// redrew every frame on the main thread, competing with the bundle, Firebase and the first render (25 November).
const keyframes = '@keyframes nummo-spin { to { transform: rotate(360deg); } }';

export function Spinner({ label, size = 24 }: { label: string; size?: number }) {
  const { colors } = useTheme();
  const stroke = size / 10;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={label} aria-busy style={{ width: size, height: size, display: 'flex' }}>
      <style>{keyframes}</style>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden
        style={{ animation: 'nummo-spin 0.9s linear infinite', transformOrigin: '50% 50%' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.primary} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${length * 0.75} ${length}`} />
      </svg>
    </div>
  );
}
