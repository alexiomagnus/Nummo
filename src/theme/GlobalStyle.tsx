import { useEffect } from 'react';
import { useTheme } from 'react-native-paper';

// Web-only rules RN Web cannot express: visible keyboard focus, dynamic viewport height
// (virtual keyboard friendly) and reduced motion.
export function GlobalStyle() {
  const { colors, dark } = useTheme();
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'nummo-global';
    style.textContent = `
      html, body, #root { height: 100%; }
      @supports (height: 100dvh) { html, body, #root { height: 100dvh; } }
      body { overflow: hidden; margin: 0; background: ${colors.background}; color-scheme: ${dark ? 'dark' : 'light'}; }
      :focus { outline: none; }
      :focus-visible { outline: 3px solid ${colors.primary}; outline-offset: 2px; border-radius: 4px; }
      input:focus-visible, textarea:focus-visible { outline: none; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
      }`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [colors.background, colors.primary, dark]);
  return null;
}
