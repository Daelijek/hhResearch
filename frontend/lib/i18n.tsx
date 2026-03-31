"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { kk } from "./locales/kk";

export type Lang = "en" | "ru" | "kk";
type Dict = Record<string, string>;

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const dictionaries: Record<Lang, Dict> = {
  en,
  ru,
  kk,
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("hh_lang");
    if (saved === "en" || saved === "ru" || saved === "kk") {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hh_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let text = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
        if (vars) {
          Object.entries(vars).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, v);
          });
        }
        return text;
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}
