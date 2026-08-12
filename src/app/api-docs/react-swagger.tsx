"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

/**
 * Client-side Swagger UI. The spec is generated at build time on the server
 * and passed in as a prop so no runtime fetch happens and the page is fully
 * static for CDN caching.
 */
export function ReactSwagger({ spec }: { spec: object }) {
  return (
    <SwaggerUI
      spec={spec}
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
