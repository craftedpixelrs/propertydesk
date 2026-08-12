"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

/**
 * Client-side Swagger UI. Fetches the OpenAPI spec from `/api/docs`
 * (build-time snapshot in `public/api-docs.json`).
 *
 * Try-it-out relies on same-origin cookies: `withCredentials` makes the
 * browser send the HttpOnly session cookie set by `/api/auth/sign-in/*`
 * or the `/sign-in` page. Swagger Authorize cannot invent that cookie.
 */
export function ReactSwagger({ url }: { url: string }) {
  return (
    <SwaggerUI
      url={url}
      docExpansion="list"
      defaultModelsExpandDepth={1}
      defaultModelExpandDepth={2}
      displayOperationId={false}
      filter
      persistAuthorization
      tryItOutEnabled
      withCredentials
      syntaxHighlight={{ activate: true, theme: "agate" }}
      requestInterceptor={(req) => {
        // Prefer same-origin relative URLs so Try-it-out never jumps to a
        // stale absolute server entry (localhost / staging) by accident.
        if (typeof window !== "undefined" && req.url) {
          try {
            const parsed = new URL(req.url, window.location.origin);
            if (parsed.origin === window.location.origin) {
              req.url = parsed.pathname + parsed.search;
            }
          } catch {
            // leave url as-is
          }
        }
        return req;
      }}
    />
  );
}
