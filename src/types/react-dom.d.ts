// react-dom (a direct dependency, the renderer under React Native Web) ships without types, and @types/react-dom is not
// installed: declare only the API the app uses. flushSync: commit an update synchronously, before the browser paints
// (AppShell, virtual keyboard). createPortal: the app lock screen, outside `#root` so the app under it can be inert.
declare module 'react-dom' {
  export function flushSync<R>(fn: () => R): R;
  export function createPortal(children: import('react').ReactNode, container: Element): import('react').ReactPortal;
}
