"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import {
  DEFAULT_LOCALE,
  htmlLang,
  t as translate,
  writeLocaleCookieValue,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

type Translate = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      document.cookie = writeLocaleCookieValue(next);
      document.documentElement.lang = htmlLang(next);
      try {
        await apiClient.patch("/me", { locale: next });
      } catch {
        // Guests only keep the cookie.
      }
      router.refresh();
    },
    [router],
  );

  const t = useCallback<Translate>(
    (key, vars) => translate(key, vars, locale),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: async () => {},
      t: (key, vars) => translate(key, vars, DEFAULT_LOCALE),
    };
  }
  return ctx;
}

export function useT(): Translate {
  return useI18n().t;
}
