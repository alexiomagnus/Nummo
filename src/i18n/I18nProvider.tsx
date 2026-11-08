import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { formatCivilDate, formatCurrency, locales, translate, type Language, type Values } from './translate';

function messages(language: Language) {
  return { language, locale: locales[language],
    t: (source: string, values?: Values) => translate(language, source, values),
    formatAmount: (amount: number) => formatCurrency(amount, language),
    formatDate: (date: string, options?: Intl.DateTimeFormatOptions) => formatCivilDate(date, language, options),
  };
}
const I18nContext = createContext(messages('it'));

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo(() => messages(language), [language]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
