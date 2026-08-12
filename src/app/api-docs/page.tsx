import type { Metadata } from "next";

import { getApiDocs } from "@/lib/swagger";
import { ReactSwagger } from "./react-swagger";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "API Docs",
  description:
    "Interaktivna dokumentacija PropertyDesk REST API-ja (OpenAPI 3.1).",
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  const spec = getApiDocs();
  return (
    <section className="container mx-auto px-4 py-8">
      <ReactSwagger spec={spec} />
    </section>
  );
}
