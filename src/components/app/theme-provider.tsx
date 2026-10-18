"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiClient } from "@/lib/api-client";
import {
  DEFAULT_THEME,
  applyThemeToDocument,
  writeThemeCookieValue,
  type Theme,
} from "@/lib/theme";
import { isPublicSharePath } from "@/lib/theme/public-share";

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
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  // Shared links never follow the visitor's dark theme.
  const visible: Theme = isPublicSharePath(pathname) ? "light" : theme;

  useEffect(() => {
    setThemeState(initialTheme);
  }, [initialTheme]);

  useLayoutEffect(() => {
    applyThemeToDocument(visible);
  }, [visible]);

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next);
      if (!isPublicSharePath(window.location.pathname)) {
        applyThemeToDocument(next);
      }
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
