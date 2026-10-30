import { NextResponse } from "next/server";

import { DomainErrors } from "@/lib/errors";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { assertResidentCanReadDocument } from "@/server/services/documents.service";
import { storage } from "@/server/storage";

/**
 * Resident-facing download. The signed-in resident may fetch any
 * document on a building/unit they have active access to with
 * visibility=RESIDENT_SHARED, plus any document on a ticket they filed.
 * Mirrors `listResidentDocuments` so the UI never shows a link it can't
 * open.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    if (!id) throw DomainErrors.badRequest("Nedostaje ID dokumenta.");
    const session = await requireResidentSession();
    const accesses = await listResidentUnitsForSession(session);
    const buildingIds = Array.from(new Set(accesses.map((a) => a.unit.buildingId)));
    const unitIds = accesses.map((a) => a.unitId);

    const doc = await assertResidentCanReadDocument({
      personId: session.personId,
      buildingIds,
      unitIds,
      documentId: id,
    });

    // Try remote signed URL first; local provider returns a `local:`
    // sentinel and we stream the bytes through this route.
    const url = await storage().getSignedUrl(doc.storageKey);
    if (!url.startsWith("local:")) {
      return NextResponse.redirect(url, 302);
    }
    const buffer = await storage().read(doc.storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": doc.mimeType,
        "content-disposition": `inline; filename="${encodeURIComponent(doc.originalFileName)}"`,
        "cache-control": "private, max-age=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška.";
    const code = (err as { code?: string } | null)?.code ?? "";
    const status =
      code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : code === "VALIDATION" ? 422 : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
