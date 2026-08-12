import type { Metadata } from "next";

import { ReactSwagger } from "./react-swagger";

export const metadata: Metadata = {
  title: "API Docs",
  description:
    "Interaktivna dokumentacija PropertyDesk REST API-ja (OpenAPI 3.1).",
  robots: { index: false, follow: false },
};

/**
 * Client-side fetch of the spec ensures we always serve the live version
 * (not a build-time snapshot) and avoids Turbopack stripping JSDoc comments
 * from route files during production build.
 */
export default function ApiDocsPage() {
  return (
    <section className="container mx-auto px-4 py-8">
      <ReactSwagger url="/api/docs" />
    </section>
  );
}
