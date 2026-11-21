import { english } from './en.ts';

export type Language = 'it' | 'en';
export const locales = { it: 'it-IT', en: 'en-GB' } as const;
export type Values = Readonly<Record<string, string | number>>;
const interpolate = (source: string, values: Values) => source.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const entries = Object.entries(english).sort(([a], [b]) => b.length - a.length);
const templates = entries.filter(([source]) => /\{\w+\}/.test(source)).map(([source, target]) => ({
  source, target, names: [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!),
  pattern: new RegExp('^' + source.split(/\{\w+\}/).map(escape).join('([\\s\\S]*?)') + '$'),
}));

// Pure translation. Domain/services keep their existing validation messages; the
// UI translates them here, including parameterised errors, without global state.
export function translate(language: Language, message: string, values: Values = {}): string {
  if (language === 'it' || !message.trim()) return interpolate(message, values);
  const source = message.trim();
  let target = Object.hasOwn(english, source) ? english[source] : undefined;
  if (target === undefined) {
    for (const entry of templates) {
      const match = entry.pattern.exec(source);
      if (!match) continue;
      const captured = Object.fromEntries(entry.names.map((name, index) => [name, match[index + 1]!]));
      target = interpolate(entry.target, captured);
      break;
    }
  }
  if (target === undefined) {
    // Import/replacement failures may append the underlying domain error.
    const prefix = entries.find(([key]) => !key.includes('{') && key.endsWith('.') && source.startsWith(key + ' '));
    if (prefix) target = prefix[1] + ' ' + translate(language, source.slice(prefix[0].length + 1));
  }
  return message.slice(0, message.indexOf(source)) + interpolate(target ?? source, values) + message.slice(message.indexOf(source) + source.length);
}

// Intl formatters are costly to build (locale data lookup) and cheap to reuse: one per locale and options, built on first
// use. Creating one per amount or date made every list and chart render pay for it (21 November: about 6 ms per tap of
// the Analisi legend with CPU 4×). Options must be plain data (they are the cache key).
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();
export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let format = numberFormats.get(key);
  if (!format) { format = new Intl.NumberFormat(locale, options); numberFormats.set(key, format); }
  return format;
}
export function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options);
  let format = dateFormats.get(key);
  if (!format) { format = new Intl.DateTimeFormat(locale, options); dateFormats.set(key, format); }
  return format;
}

export function formatCurrency(amountMinor: number, language: Language): string {
  return numberFormat(locales[language], { style: 'currency', currency: 'EUR' }).format(amountMinor / 100);
}

export function formatCivilDate(date: string, language: Language, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return dateTimeFormat(locales[language], { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
