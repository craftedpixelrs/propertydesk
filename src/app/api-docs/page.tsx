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
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-medium">Kako da isprobaš endpointe</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            Server mora ostati na{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
              Trenutni host (same-origin)
            </code>
            — lokalni localhost sa produkcije daje „Failed to fetch“.
          </li>
          <li>
            Za zaštićene rute prvo se uloguj na{" "}
            <a className="underline" href="/sign-in">
              /sign-in
            </a>
            . Authorize u Swaggeru ne može da setuje HttpOnly cookie.
          </li>
          <li>
            Demo:{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
              admin@propertydesk.test
            </code>{" "}
            /{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">
              PropertyDesk!2026
            </code>
          </li>
        </ol>
      </div>
      <ReactSwagger url="/api/docs" />
    </section>
  );
}
