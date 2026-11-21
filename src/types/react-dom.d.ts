// react-dom (a direct dependency, the renderer under React Native Web) ships without types, and @types/react-dom is not
// installed: declare only the API the app uses. flushSync: commit an update synchronously, before the browser paints
// (AppShell, virtual keyboard).
declare module 'react-dom' {
  export function flushSync<R>(fn: () => R): R;
}
