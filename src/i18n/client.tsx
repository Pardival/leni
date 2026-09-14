"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getMessages, type Locale } from ".";
import type { Messages } from "./types";

type I18nContextValue = { locale: Locale; m: Messages };

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, m: getMessages(locale) }}>{children}</I18nContext.Provider>
  );
}

/** Accès aux messages depuis un composant client. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
