"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  isSupportedLocale,
  translate,
  translateFilterOption,
  translateGenre,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";

export interface I18nContextType {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  tGenre: (genreName: string) => string;
  tFilter: (option: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function readPersistedLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // Ignore storage errors
  }

  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]+)`),
    );
    const fromCookie = match?.[1];
    if (isSupportedLocale(fromCookie)) return fromCookie;
  } catch {
    // Ignore cookie read errors
  }

  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const persisted = readPersistedLocale();
    if (persisted !== DEFAULT_LOCALE) {
      queueMicrotask(() => {
        setLocaleState(persisted);
      });
    }
    document.documentElement.lang = persisted;
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      } catch {
        // Ignore storage errors
      }
      document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = nextLocale;
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      translate(locale, key, params),
    [locale],
  );

  const tGenre = useCallback(
    (genreName: string) => translateGenre(locale, genreName),
    [locale],
  );

  const tFilter = useCallback(
    (option: string) => translateFilterOption(locale, option),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, tGenre, tFilter }),
    [locale, setLocale, t, tGenre, tFilter],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
