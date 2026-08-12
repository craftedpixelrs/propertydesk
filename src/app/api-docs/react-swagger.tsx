"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

/**
 * Client-side Swagger UI. Fetches the spec from `/api/docs` at runtime,
 * which guarantees we always serve the live version (not a build-time
 * snapshot) and sidesteps Turbopack stripping JSDoc comments from route
 * files during production build.
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
      syntaxHighlight={{ activate: true, theme: "agate" }}
    />
  );
}
