declare module "swagger-ui-dist/swagger-ui-bundle.js" {
  export interface SwaggerUIBundleOptions {
    domNode?: HTMLElement | null;
    dom_id?: string;
    url?: string;
    spec?: object;
    presets?: unknown[];
    layout?: string;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    filter?: boolean | string;
    persistAuthorization?: boolean;
    tryItOutEnabled?: boolean;
    withCredentials?: boolean;
    syntaxHighlight?: boolean | { activate?: boolean; theme?: string };
    requestInterceptor?: <T extends { url: string }>(req: T) => T;
  }

  export interface SwaggerUIBundleFn {
    (options: SwaggerUIBundleOptions): unknown;
    presets: { apis: unknown };
  }

  const SwaggerUIBundle: SwaggerUIBundleFn;
  export default SwaggerUIBundle;
  export { SwaggerUIBundle };
}

declare module "swagger-ui-dist/swagger-ui.css";
