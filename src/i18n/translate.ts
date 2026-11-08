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
      // These error templates include another application error as their last value.
      if (/^(Il file contiene|Con questo file)/.test(entry.source)) {
        const last = entry.names[entry.names.length - 1]!;
        captured[last] = translate(language, captured[last]!);
      }
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

export function formatCurrency(amountMinor: number, language: Language): string {
  return new Intl.NumberFormat(locales[language], { style: 'currency', currency: 'EUR' }).format(amountMinor / 100);
}

export function formatCivilDate(date: string, language: Language, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat(locales[language], { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}
