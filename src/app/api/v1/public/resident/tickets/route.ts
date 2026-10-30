import { NextResponse } from "next/server";

import { DomainErrors } from "@/lib/errors";
import { requireResidentSession } from "@/server/auth/resident-guard";
import { listResidentUnitsForSession } from "@/server/auth/resident-session";
import { createMaintenanceTicket } from "@/server/services/manager/maintenance.service";
import { uploadDocument } from "@/server/services/documents.service";

/**
 * Resident-facing endpoint: lets a signed-in resident file a ticket with
 * one or more photos. Scoped by `pd_resident` cookie — only units the
 * resident has active access to can be targeted.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await requireResidentSession();
    const form = await req.formData().catch(() => null);
    if (!form) throw DomainErrors.badRequest("Neispravna forma.");

    const unitId = String(form.get("unitId") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!unitId || !title) throw DomainErrors.badRequest("Deo i opis su obavezni.");

    const accesses = await listResidentUnitsForSession(session);
    const match = accesses.find((a) => a.unitId === unitId);
    if (!match) throw DomainErrors.forbidden("Nemate pristup ovom posebnom delu.");

    const ticket = await createMaintenanceTicket({
      organizationId: match.organizationId,
      // Residents are not `User` rows; the identity lives on
      // `reportedByPersonId` and the service fans out notifications to
      // every manager with `ticket.manage` because actorUserId is null.
      actorUserId: null,
      buildingId: match.unit.buildingId,
      unitId: match.unitId,
      title,
      description: description || null,
      reportedByPersonId: session.personId,
      priority: "NORMAL",
    });

    const photos = form.getAll("photos").filter((f): f is File => f instanceof File);
    for (const photo of photos.slice(0, 5)) {
      if (!photo.type.startsWith("image/")) continue;
      const buffer = Buffer.from(await photo.arrayBuffer());
      await uploadDocument({
        organizationId: match.organizationId,
        actorUserId: null,
        actorPersonId: session.personId,
        category: "TICKET",
        entityType: "MaintenanceTicket",
        entityId: ticket.id,
        visibility: "INTERNAL",
        fileName: photo.name,
        mimeType: photo.type,
        buffer,
      });
    }

    return NextResponse.json({ data: { id: ticket.id } }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška.";
    const status =
      (err as { code?: string } | null)?.code === "FORBIDDEN"
        ? 403
        : (err as { code?: string } | null)?.code === "VALIDATION"
          ? 422
          : 400;
    return NextResponse.json({ error: { message } }, { status });
  }
}
