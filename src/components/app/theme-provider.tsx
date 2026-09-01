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
  DEFAULT_THEME,
  applyThemeToDocument,
  writeThemeCookieValue,
  type Theme,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  theme: initialTheme,
  children,
}: {
  theme: Theme;
  children: ReactNode;
}) {
  const router = useRouter();
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    setThemeState(initialTheme);
    applyThemeToDocument(initialTheme);
  }, [initialTheme]);

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next);
      applyThemeToDocument(next);
      document.cookie = writeThemeCookieValue(next);
      try {
        await apiClient.patch("/me", { theme: next });
      } catch {
        // Guests only keep the cookie.
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME,
      setTheme: async () => {},
    };
  }
  return ctx;
}
