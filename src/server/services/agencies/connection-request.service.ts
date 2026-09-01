import "server-only";
import type { AgencyConnectionRequestStatus, Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";
import { assertQuota } from "@/server/services/quotas.service";
import { serverEnv } from "@/lib/env";
import {
  agencyConnectionRequestReceivedEmail,
  agencyConnectionRequestReviewedEmail,
  sendEmail,
} from "@/server/auth/email";
import {
  ensureUniqueReferralCode,
  grantProjectAccess,
} from "@/server/services/agencies/agencies.service";

const REQUEST_INCLUDE = {
  agency: {
    select: {
      id: true,
      name: true,
      profile: {
        select: {
          displayName: true,
          legalName: true,
          taxNumber: true,
          city: true,
          email: true,
          phone: true,
          verificationStatus: true,
        },
      },
    },
  },
  investor: {
    select: {
      id: true,
      name: true,
      profile: { select: { displayName: true, email: true } },
    },
  },
  project: { select: { id: true, name: true, city: true } },
} satisfies Prisma.AgencyConnectionRequestInclude;

export type AgencyConnectionRequestDto = Prisma.AgencyConnectionRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

async function requireVerifiedAgency(agencyOrganizationId: string) {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId: agencyOrganizationId },
  });
  if (!profile || profile.type !== "AGENCY") {
    throw DomainErrors.forbidden("Samo agencija može slati zahtev za saradnju.");
  }
  if (profile.status === "SUSPENDED" || profile.status === "CLOSED") {
    throw DomainErrors.forbidden("Nalog agencije nije aktivan.");
  }
  if (profile.verificationStatus !== "VERIFIED") {
    throw DomainErrors.forbidden(
      "Zahtev za saradnju možete slati tek kad platforma verifikuje agenciju.",
    );
  }
  return profile;
}

async function notifyEmails(organizationId: string): Promise<string[]> {
  const [profile, owners] = await Promise.all([
    prisma.organizationProfile.findUnique({
      where: { organizationId },
      select: { email: true },
    }),
    prisma.member.findMany({
      where: {
        organizationId,
        role: { in: ["INVESTOR_OWNER", "INVESTOR_ADMIN", "AGENCY_OWNER", "AGENCY_ADMIN"] },
      },
      select: { user: { select: { email: true } } },
    }),
  ]);
  const emails = new Set<string>();
  const profileEmail = profile?.email?.trim().toLowerCase();
  if (profileEmail) emails.add(profileEmail);
  for (const row of owners) {
    const email = row.user.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }
  return [...emails];
}

export async function createConnectionRequest(input: {
  agencyOrganizationId: string;
  actorUserId: string;
  investorOrganizationId: string;
  projectId?: string | null;
  message?: string | null;
}): Promise<AgencyConnectionRequestDto> {
  await requireVerifiedAgency(input.agencyOrganizationId);
  if (input.agencyOrganizationId === input.investorOrganizationId) {
    throw DomainErrors.badRequest("Ne možete poslati zahtev sopstvenoj organizaciji.");
  }

  const investor = await prisma.organization.findUnique({
    where: { id: input.investorOrganizationId },
    include: { profile: true },
  });
  if (!investor || investor.profile?.type !== "INVESTOR") {
    throw DomainErrors.notFound("Investitor");
  }
  if (investor.profile.status !== "ACTIVE" && investor.profile.status !== "TRIAL") {
    throw DomainErrors.invalidState("Investitor trenutno ne prima zahteve.");
  }

  const catalogCount = await prisma.project.count({
    where: {
      organizationId: input.investorOrganizationId,
      networkCatalogEnabled: true,
      archivedAt: null,
      isActive: true,
    },
  });
  if (catalogCount === 0) {
    throw DomainErrors.invalidState(
      "Ovaj investitor nije otvorio projekte za mrežu agencija.",
    );
  }

  let projectId = input.projectId?.trim() || null;
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: input.investorOrganizationId,
        networkCatalogEnabled: true,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!project) {
      throw DomainErrors.notFound("Projekat");
    }
  }

  const existingConnection = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: input.investorOrganizationId,
      agencyOrganizationId: input.agencyOrganizationId,
      status: { in: ["ACTIVE", "INVITED"] },
    },
    select: { id: true, status: true },
  });
  if (existingConnection) {
    throw DomainErrors.conflict(
      existingConnection.status === "INVITED"
        ? "Investitor Vas je već pozvao. Prihvatite poziv na stranici Konekcije."
        : "Već ste povezani sa ovim investitorom.",
    );
  }

  const existingPending = await prisma.agencyConnectionRequest.findFirst({
    where: {
      investorOrganizationId: input.investorOrganizationId,
      agencyOrganizationId: input.agencyOrganizationId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existingPending) {
    throw DomainErrors.conflict("Zahtev ovom investitoru već čeka odgovor.");
  }

  const created = await prisma.agencyConnectionRequest.create({
    data: {
      agencyOrganizationId: input.agencyOrganizationId,
      investorOrganizationId: input.investorOrganizationId,
      projectId,
      message: input.message?.trim() || null,
      createdByUserId: input.actorUserId,
    },
    include: REQUEST_INCLUDE,
  });

  await recordAudit({
    action: "agency.connection_request_created",
    entityType: "AgencyConnectionRequest",
    entityId: created.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
    newValues: {
      investorOrganizationId: input.investorOrganizationId,
      projectId,
    },
  });

  const appUrl = serverEnv.BETTER_AUTH_URL.replace(/\/$/, "");
  const agencyName =
    created.agency.profile?.displayName?.trim() || created.agency.name;
  const recipients = await notifyEmails(input.investorOrganizationId);
  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        ...agencyConnectionRequestReceivedEmail(
          agencyName,
          `${appUrl}/agencije`,
        ),
        to,
      }),
    ),
  );

  return created;
}

export async function listConnectionRequests(input: {
  organizationId: string;
  role: "INVESTOR" | "AGENCY";
  status?: AgencyConnectionRequestStatus[];
}): Promise<AgencyConnectionRequestDto[]> {
  return prisma.agencyConnectionRequest.findMany({
    where: {
      ...(input.role === "INVESTOR"
        ? { investorOrganizationId: input.organizationId }
        : { agencyOrganizationId: input.organizationId }),
      ...(input.status?.length ? { status: { in: input.status } } : {}),
    },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelConnectionRequest(input: {
  agencyOrganizationId: string;
  actorUserId: string;
  requestId: string;
}) {
  const existing = await prisma.agencyConnectionRequest.findFirst({
    where: { id: input.requestId, agencyOrganizationId: input.agencyOrganizationId },
  });
  if (!existing) throw DomainErrors.notFound("Zahtev");
  if (existing.status !== "PENDING") {
    throw DomainErrors.invalidState("Samo zahtev na čekanju može da se otkaže.");
  }
  const updated = await prisma.agencyConnectionRequest.update({
    where: { id: existing.id },
    data: {
      status: "CANCELED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
    },
    include: REQUEST_INCLUDE,
  });
  await recordAudit({
    action: "agency.connection_request_canceled",
    entityType: "AgencyConnectionRequest",
    entityId: existing.id,
    organizationId: input.agencyOrganizationId,
    actorUserId: input.actorUserId,
  });
  return updated;
}

export async function acceptConnectionRequest(input: {
  investorOrganizationId: string;
  actorUserId: string;
  requestId: string;
}) {
  const existing = await prisma.agencyConnectionRequest.findFirst({
    where: {
      id: input.requestId,
      investorOrganizationId: input.investorOrganizationId,
    },
  });
  if (!existing) throw DomainErrors.notFound("Zahtev");
  if (existing.status !== "PENDING") {
    throw DomainErrors.invalidState("Ovaj zahtev je već obrađen.");
  }

  let connection = await prisma.agencyConnection.findFirst({
    where: {
      investorOrganizationId: input.investorOrganizationId,
      agencyOrganizationId: existing.agencyOrganizationId,
    },
  });

  if (!connection || connection.status === "REJECTED" || connection.status === "TERMINATED") {
    await assertQuota(input.investorOrganizationId, "agencies");
    const referralCode = connection?.referralCode ?? (await ensureUniqueReferralCode());
    connection = await prisma.agencyConnection.upsert({
      where: {
        investorOrganizationId_agencyOrganizationId: {
          investorOrganizationId: input.investorOrganizationId,
          agencyOrganizationId: existing.agencyOrganizationId,
        },
      },
      create: {
        investorOrganizationId: input.investorOrganizationId,
        agencyOrganizationId: existing.agencyOrganizationId,
        invitedByUserId: input.actorUserId,
        status: "ACTIVE",
        acceptedAt: new Date(),
        referralCode,
        notes: existing.message,
      },
      update: {
        status: "ACTIVE",
        acceptedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
        invitedByUserId: input.actorUserId,
      },
    });
  } else if (connection.status === "INVITED") {
    connection = await prisma.agencyConnection.update({
      where: { id: connection.id },
      data: { status: "ACTIVE", acceptedAt: new Date() },
    });
  } else if (connection.status === "SUSPENDED") {
    throw DomainErrors.invalidState(
      "Konekcija sa ovom agencijom je suspendovana. Reaktivirajte je pa pokušajte ponovo.",
    );
  }

  if (existing.projectId) {
    const already = await prisma.agencyProjectAccess.findUnique({
      where: {
        agencyConnectionId_projectId: {
          agencyConnectionId: connection.id,
          projectId: existing.projectId,
        },
      },
    });
    if (!already || already.status !== "ACTIVE") {
      await grantProjectAccess({
        investorOrganizationId: input.investorOrganizationId,
        actorUserId: input.actorUserId,
        connectionId: connection.id,
        projectId: existing.projectId,
      });
    }
  }

  await prisma.organizationProfile.updateMany({
    where: {
      organizationId: existing.agencyOrganizationId,
      type: "AGENCY",
      verificationStatus: "PENDING",
    },
    data: {
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      verifiedByUserId: input.actorUserId,
      verificationNote: "Automatski posle prihvata zahteva za saradnju.",
    },
  });

  const updated = await prisma.agencyConnectionRequest.update({
    where: { id: existing.id },
    data: {
      status: "ACCEPTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      resultingConnectionId: connection.id,
    },
    include: REQUEST_INCLUDE,
  });

  await recordAudit({
    action: "agency.connection_request_accepted",
    entityType: "AgencyConnectionRequest",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { connectionId: connection.id },
  });

  const appUrl = serverEnv.BETTER_AUTH_URL.replace(/\/$/, "");
  const investorName =
    updated.investor.profile?.displayName?.trim() || updated.investor.name;
  const recipients = await notifyEmails(existing.agencyOrganizationId);
  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        ...agencyConnectionRequestReviewedEmail(
          investorName,
          true,
          `${appUrl}/agencija/konekcije`,
        ),
        to,
      }),
    ),
  );

  return { request: updated, connection };
}

export async function rejectConnectionRequest(input: {
  investorOrganizationId: string;
  actorUserId: string;
  requestId: string;
  reason?: string;
}) {
  const existing = await prisma.agencyConnectionRequest.findFirst({
    where: {
      id: input.requestId,
      investorOrganizationId: input.investorOrganizationId,
    },
  });
  if (!existing) throw DomainErrors.notFound("Zahtev");
  if (existing.status !== "PENDING") {
    throw DomainErrors.invalidState("Ovaj zahtev je već obrađen.");
  }

  const updated = await prisma.agencyConnectionRequest.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedByUserId: input.actorUserId,
      rejectionReason: input.reason?.trim() || null,
    },
    include: REQUEST_INCLUDE,
  });

  await recordAudit({
    action: "agency.connection_request_rejected",
    entityType: "AgencyConnectionRequest",
    entityId: existing.id,
    organizationId: input.investorOrganizationId,
    actorUserId: input.actorUserId,
    newValues: { reason: input.reason },
  });

  const appUrl = serverEnv.BETTER_AUTH_URL.replace(/\/$/, "");
  const investorName =
    updated.investor.profile?.displayName?.trim() || updated.investor.name;
  const recipients = await notifyEmails(existing.agencyOrganizationId);
  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        ...agencyConnectionRequestReviewedEmail(
          investorName,
          false,
          `${appUrl}/katalog`,
        ),
        to,
      }),
    ),
  );

  return updated;
}
