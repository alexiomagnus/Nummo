// Safe-area metrics for the first render. Without them SafeAreaProvider renders nothing until an effect has
// measured the insets, which costs an extra commit before any content. The values come from the same CSS `env()`
// measurement the library performs, only taken synchronously.
type Inset = 'top' | 'right' | 'bottom' | 'left';
const read = (name: Inset): string => `env(safe-area-inset-${name}, 0px)`;

export function initialSafeAreaMetrics() {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  try {
    const probe = document.createElement('div');
    probe.style.cssText = `position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;overflow:hidden;padding:${read('top')} ${read('right')} ${read('bottom')} ${read('left')}`;
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);
    const px = (value: string) => Number.parseInt(value, 10) || 0;
    const insets = { top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft) };
    probe.remove();
    return { insets, frame };
  } catch { return { insets: zero, frame }; }
}
