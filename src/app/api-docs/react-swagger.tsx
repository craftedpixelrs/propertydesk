"use client";

import { useEffect, useRef } from "react";
import "swagger-ui-dist/swagger-ui.css";

/**
 * Imperative Swagger UI mount via `swagger-ui-dist`.
 *
 * We intentionally avoid `swagger-ui-react` — its peer deps pin React 18
 * (`react-debounce-input`, `react-inspector`) and with React 19 the
 * operation body / Try-it-out panel fails to render after Execute
 * (fetch succeeds, UI stays empty + console.error `{}`).
 *
 * Try-it-out relies on same-origin cookies: `withCredentials` makes the
 * browser send the HttpOnly session cookie set by `/sign-in`. Swagger
 * Authorize cannot invent that cookie.
 */
export function ReactSwagger({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void (async () => {
      // Import the browser bundle directly — the package `index.js`
      // swallows load errors in Node and can leave SwaggerUIBundle undefined.
      const mod = await import("swagger-ui-dist/swagger-ui-bundle.js");
      const SwaggerUIBundle =
        (mod as { default?: typeof mod.SwaggerUIBundle }).default ??
        mod.SwaggerUIBundle;

      if (cancelled || !containerRef.current || !SwaggerUIBundle) return;

      containerRef.current.innerHTML = "";

      SwaggerUIBundle({
        domNode: containerRef.current,
        url,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        displayOperationId: false,
        filter: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        withCredentials: true,
        syntaxHighlight: { activate: true, theme: "agate" },
        requestInterceptor: (req: { url: string }) => {
          if (typeof window === "undefined" || !req.url) return req;
          try {
            const parsed = new URL(req.url, window.location.origin);
            // Absolute same-origin when server is "/". Leave cross-origin
            // picks (prod / localhost absolute) untouched.
            if (
              parsed.origin === window.location.origin ||
              req.url.startsWith("/")
            ) {
              req.url = parsed.href;
            }
          } catch {
            // leave as-is
          }
          return req;
        },
      });
    })();

    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [url]);

  return <div ref={containerRef} className="swagger-ui-wrap" />;
}
