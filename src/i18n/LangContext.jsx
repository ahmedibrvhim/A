import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

const LangContext = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('brandA_lang');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch (e) {}
  return (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('brandA_lang', lang); } catch (e) {}
  }, [lang]);

  const t = useCallback((key, vars) => {
    let s = translations[lang][key] ?? translations.en[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
    return s;
  }, [lang]);

  const value = useMemo(() => ({
    lang, t, dir: lang === 'ar' ? 'rtl' : 'ltr',
    setLang: setLangState,
    toggle: () => setLangState(l => (l === 'ar' ? 'en' : 'ar')),
  }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
