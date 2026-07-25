import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Central PDF renderer. Callers pass a `@react-pdf/renderer` Document
 * element and get back a Node.js `Buffer` suitable for
 * `new NextResponse(buffer, { headers: … })`.
 *
 * Isolating this call in one module keeps direct imports of
 * `@react-pdf/renderer` server-only and makes it trivial to mock in tests.
 */
export async function renderPdf(element: ReactElement<DocumentProps>): Promise<Buffer> {
  return renderToBuffer(element);
}

export function pdfResponseHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.pdf"`,
    "Cache-Control": "no-store",
  };
}
