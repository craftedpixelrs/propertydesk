"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api-client";
import { CommandPaletteProvider } from "@/components/app/command-palette";
import { I18nProvider } from "@/components/app/i18n-provider";
import { ThemeProvider } from "@/components/app/theme-provider";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";

/**
 * Client-side providers root. Kept intentionally small so the majority of
 * the tree stays in Server Component land.
 */
export function Providers({
  children,
  locale,
  theme,
}: {
  children: ReactNode;
  locale: Locale;
  theme: Theme;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof ApiClientError) {
                // Don't retry auth or client errors.
                if (
                  error.statusCode >= 400 &&
                  error.statusCode < 500 &&
                  error.statusCode !== 429
                ) {
                  return false;
                }
              }
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <ThemeProvider theme={theme}>
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
