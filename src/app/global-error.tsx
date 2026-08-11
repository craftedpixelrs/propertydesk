"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Root-level error boundary. Catches exceptions in the root layout —
 * because it replaces the entire document, it must render its own
 * `<html>` / `<body>` and cannot depend on `Providers` or i18n bootstrap.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward the root-level crash to Sentry. `captureException` is a
    // no-op when the DSN is not configured.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="sr-Latn">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <main
          role="main"
          style={{ maxWidth: 480, padding: 24, textAlign: "center" }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#dc2626",
            }}
          >
            Kritična greška
          </p>
          <h1 style={{ marginTop: 8, fontSize: 24, fontWeight: 600 }}>
            Aplikacija je naišla na neočekivan problem
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "#475569" }}>
            Osvežite stranicu ili se vratite kasnije. Ako se problem ponavlja,
            kontaktirajte podršku sa oznakom{" "}
            <code
              style={{
                backgroundColor: "#e2e8f0",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {error.digest ?? "N/A"}
            </code>
            .
          </p>
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 6,
                background: "#0f766e",
                color: "#fff",
                fontWeight: 500,
                border: 0,
                cursor: "pointer",
              }}
            >
              Pokušaj ponovo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
