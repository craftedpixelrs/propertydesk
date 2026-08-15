import type { Metadata } from "next";

import { ReactSwagger } from "./react-swagger";

export const metadata: Metadata = {
  title: "API Docs",
  description:
    "Interaktivna dokumentacija PropertyDesk REST API-ja (OpenAPI 3.1).",
  robots: { index: false, follow: false },
};

/**
 * Renders Swagger UI against `/api/docs`. The JSON itself is a build-time
 * snapshot (`public/api-docs.json` via `scripts/build-swagger-spec.ts`) —
 * regenerates on every `pnpm build`.
 *
 * Za Try it out na zaštićenim rutama: uloguj se na `/sign-in` u istom
 * browseru, pa se vrati ovde. Session cookie je HttpOnly i šalje se
 * automatski (Authorize dugme ga ne može setovati).
 */
export default function ApiDocsPage() {
  return (
    <section className="container mx-auto px-4 py-8">
      <ReactSwagger url="/api/docs" />
    </section>
  );
}
