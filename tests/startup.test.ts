import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { accents, buildScheme } from '../src/theme/palette.ts';
import { bootThemeKey, makeBootTheme } from '../src/theme/bootTheme.ts';
import { parseSessionHint, readSessionHint, sessionHintKey, writeSessionHint } from '../src/services/sessionHint.ts';
import { initialSafeAreaMetrics } from '../src/theme/initialMetrics.ts';

// The inline boot script of public/index.html, run against a minimal fake browser.
const html = readFileSync('public/index.html', 'utf8');
const script = /<script id="nummo-boot">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

function boot(items: Record<string, string>, { systemDark = false, brokenStorage = false } = {}) {
  const makeTag = (content: string, media: string) => {
    const tag = { attrs: { content, media } as Record<string, string>, removed: false,
      removeAttribute(name: string) { delete tag.attrs[name]; }, setAttribute(name: string, value: string) { tag.attrs[name] = value; }, remove() { tag.removed = true; } };
    return tag;
  };
  const tags = [makeTag('#F5FBF5', '(prefers-color-scheme: light)'), makeTag('#0F1511', '(prefers-color-scheme: dark)')];
  const vars: Record<string, string> = {}; const root = { style: { setProperty: (name: string, value: string) => { vars[name] = value; }, colorScheme: '' } };
  const links: { rel?: string; href?: string; crossOrigin?: string }[] = [];
  const document = { documentElement: root, head: { querySelectorAll: () => tags, appendChild: (link: object) => { links.push(link); } }, createElement: () => ({}) };
  const localStorage = { getItem: (key: string) => { if (brokenStorage) throw new Error('denied'); return items[key] ?? null; } };
  runInNewContext(script, { document, localStorage, matchMedia: () => ({ matches: systemDark }) });
  return { vars, root, tags, links };
}
const stored = (mode: 'system' | 'light' | 'dark') => JSON.stringify(makeBootTheme({ theme: mode, accent: 'amber', colorMode: 'mono' }));

test('avvio: lo schema salvato coincide con il tema reale per ogni tinta e modalità', () => {
  for (const accent of accents) for (const colorMode of ['mono', 'palette'] as const) {
    const theme = makeBootTheme({ theme: 'system', accent, colorMode });
    assert.equal(theme.light, buildScheme(accent, colorMode, false).background);
    assert.equal(theme.dark, buildScheme(accent, colorMode, true).background);
    assert.match(theme.light + theme.dark, /^#[0-9A-Fa-f]{6}#[0-9A-Fa-f]{6}$/);
  }
});

test('script di avvio: tema scelto o di sistema, colore della barra unico, colori statici se i dati mancano o sono invalidi', () => {
  const amber = makeBootTheme({ theme: 'dark', accent: 'amber', colorMode: 'mono' });
  const dark = boot({ [bootThemeKey]: stored('dark') });
  assert.equal(dark.vars['--nummo-boot-bg'], amber.dark);
  assert.equal(dark.root.style.colorScheme, 'dark');
  assert.equal(dark.tags[0]!.attrs.content, amber.dark);
  assert.equal('media' in dark.tags[0]!.attrs, false);
  assert.equal(dark.tags[1]!.removed, true);
  assert.equal(boot({ [bootThemeKey]: stored('light') }, { systemDark: true }).vars['--nummo-boot-bg'], amber.light);
  assert.equal(boot({ [bootThemeKey]: stored('system') }, { systemDark: true }).vars['--nummo-boot-bg'], amber.dark);
  assert.equal(boot({ [bootThemeKey]: stored('system') }, { systemDark: false }).vars['--nummo-boot-bg'], amber.light);
  for (const items of [{} as Record<string, string>, { [bootThemeKey]: '{not json' }, { [bootThemeKey]: JSON.stringify({ v: 2, mode: 'dark', dark: '#000000', light: '#ffffff' }) },
    { [bootThemeKey]: JSON.stringify({ v: 1, mode: 'dark', dark: 'red; background: url(//x)', light: '#ffffff' }) }]) {
    const result = boot(items);
    assert.deepEqual(result.vars, {});
    assert.equal(result.tags[0]!.attrs.content, '#F5FBF5');
  }
  assert.doesNotThrow(() => boot({}, { brokenStorage: true }));
});

test('script di avvio: connessioni anticipate solo dopo una sessione cloud', () => {
  assert.deepEqual(boot({ [sessionHintKey]: 'cloud' }).links.map((link) => link.href), [
    'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://firestore.googleapis.com']);
  for (const items of [{} as Record<string, string>, { [sessionHintKey]: 'local' }, { [sessionHintKey]: 'https://evil.example' }]) assert.deepEqual(boot(items).links, []);
});

test('indizio di sessione: solo valori noti, storage negato tollerato', () => {
  assert.equal(parseSessionHint('cloud'), 'cloud');
  assert.equal(parseSessionHint('local'), 'local');
  for (const value of [null, '', 'true', 'CLOUD', '{"uid":"x"}']) assert.equal(parseSessionHint(value), null);
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  writeSessionHint('cloud', storage);
  assert.equal(readSessionHint(storage), 'cloud');
  writeSessionHint(null, storage);
  assert.equal(readSessionHint(storage), null);
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
  assert.equal(readSessionHint(denied), null);
  assert.doesNotThrow(() => writeSessionHint('cloud', denied));
});

test('metriche iniziali: legge i margini di sicurezza dal CSS e ripiega su zero senza DOM', () => {
  const g = globalThis as Record<string, unknown>;
  const saved = { window: g.window, document: g.document, getComputedStyle: g.getComputedStyle };
  try {
    g.window = { innerWidth: 412, innerHeight: 915 };
    g.document = { createElement: () => ({ style: {}, remove: () => {} }), body: { appendChild: () => {} } };
    g.getComputedStyle = () => ({ paddingTop: '47px', paddingRight: '0px', paddingBottom: '34px', paddingLeft: '' });
    assert.deepEqual(initialSafeAreaMetrics(), { insets: { top: 47, right: 0, bottom: 34, left: 0 }, frame: { x: 0, y: 0, width: 412, height: 915 } });
    g.document = undefined;
    assert.deepEqual(initialSafeAreaMetrics().insets, { top: 0, right: 0, bottom: 0, left: 0 });
  } finally { Object.assign(g, saved); }
});
