import "server-only";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";
import { recordAudit } from "@/server/audit/audit";

const CAP = 5000;

function dec(value: { toString(): string } | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

/**
 * Tenant data export for the organization owner.
 *
 * JSON, not a database dump. Share-link tokens, passwords and billing
 * secrets are left out. File bytes stay in storage; the export lists
 * document names only. Capped per collection so one request cannot
 * load an unbounded table into memory.
 */
export async function exportOrganizationData(input: {
  organizationId: string;
  actorUserId: string;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      profile: true,
    },
  });
  if (!organization) throw DomainErrors.notFound("Organizacija");

  const [
    memberCount,
    projectCount,
    unitCount,
    buyerCount,
    members,
    projects,
    units,
    buyers,
    reservations,
    sales,
    payments,
    installments,
    documents,
  ] = await Promise.all([
    prisma.member.count({ where: { organizationId: input.organizationId } }),
    prisma.project.count({ where: { organizationId: input.organizationId } }),
    prisma.unit.count({ where: { organizationId: input.organizationId } }),
    prisma.buyer.count({ where: { organizationId: input.organizationId } }),
    prisma.member.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      select: {
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.project.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        address: true,
        projectStatus: true,
        defaultCurrency: true,
        createdAt: true,
        archivedAt: true,
      },
    }),
    prisma.unit.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { code: "asc" },
      select: {
        id: true,
        projectId: true,
        code: true,
        type: true,
        status: true,
        totalArea: true,
        roomCount: true,
        pricePerSquareMeter: true,
        basePrice: true,
        finalPrice: true,
        currency: true,
        internalNotes: true,
        archivedAt: true,
      },
    }),
    prisma.buyer.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        secondaryPhone: true,
        entityType: true,
        legalName: true,
        jmbg: true,
        identityNumber: true,
        taxId: true,
        addressLine1: true,
        city: true,
        postalCode: true,
        country: true,
        status: true,
        notes: true,
        anonymizedAt: true,
        createdAt: true,
      },
    }),
    prisma.reservation.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        unitId: true,
        buyerId: true,
        status: true,
        reservationAmount: true,
        currency: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    prisma.sale.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        unitId: true,
        buyerId: true,
        status: true,
        finalPrice: true,
        currency: true,
        contractDate: true,
        contractStatus: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { organizationId: input.organizationId },
      take: CAP,
      orderBy: { paymentDate: "asc" },
      select: {
        id: true,
        saleId: true,
        amount: true,
        currency: true,
        paymentDate: true,
        paymentMethod: true,
        referenceNumber: true,
        reversedAt: true,
      },
    }),
    prisma.paymentInstallment.findMany({
      where: { paymentPlan: { organizationId: input.organizationId } },
      take: CAP,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        paymentPlanId: true,
        sequenceNumber: true,
        name: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        paymentPlan: { select: { saleId: true, currency: true } },
      },
    }),
    prisma.document.findMany({
      where: { organizationId: input.organizationId, deletedAt: null },
      take: CAP,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        category: true,
        entityType: true,
        entityId: true,
        originalFileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    }),
  ]);

  const truncated = {
    members: memberCount > CAP,
    projects: projectCount > CAP,
    units: unitCount > CAP,
    buyers: buyerCount > CAP,
  };

  await recordAudit({
    action: "organization.exported",
    entityType: "Organization",
    entityId: organization.id,
    organizationId: organization.id,
    actorUserId: input.actorUserId,
    newValues: {
      buyers: buyers.length,
      units: units.length,
      sales: sales.length,
      truncated,
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    note: "Izvoz ne sadrži lozinke, tokene javnih linkova ni sadržaj fajlova. Ugovori u PDF-u ostaju u aplikaciji.",
    truncated,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: iso(organization.createdAt),
      profile: organization.profile
        ? {
            displayName: organization.profile.displayName,
            legalName: organization.profile.legalName,
            registrationNumber: organization.profile.registrationNumber,
            taxNumber: organization.profile.taxNumber,
            address: organization.profile.address,
            city: organization.profile.city,
            postalCode: organization.profile.postalCode,
            country: organization.profile.country,
            phone: organization.profile.phone,
            email: organization.profile.email,
            website: organization.profile.website,
            paymentAccountNumber: organization.profile.paymentAccountNumber,
            paymentBankName: organization.profile.paymentBankName,
          }
        : null,
    },
    members: members.map((m) => ({
      role: m.role,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
    })),
    projects: projects.map((p) => ({
      ...p,
      createdAt: iso(p.createdAt),
      archivedAt: iso(p.archivedAt),
    })),
    units: units.map((u) => ({
      ...u,
      totalArea: dec(u.totalArea),
      roomCount: dec(u.roomCount),
      pricePerSquareMeter: dec(u.pricePerSquareMeter),
      basePrice: dec(u.basePrice),
      finalPrice: dec(u.finalPrice),
      archivedAt: iso(u.archivedAt),
    })),
    buyers: buyers.map((b) => ({
      ...b,
      anonymizedAt: iso(b.anonymizedAt),
      createdAt: iso(b.createdAt),
    })),
    reservations: reservations.map((r) => ({
      ...r,
      reservationAmount: dec(r.reservationAmount),
      expiresAt: iso(r.expiresAt),
      createdAt: iso(r.createdAt),
    })),
    sales: sales.map((s) => ({
      ...s,
      finalPrice: dec(s.finalPrice),
      contractDate: iso(s.contractDate),
      createdAt: iso(s.createdAt),
    })),
    payments: payments.map((p) => ({
      ...p,
      amount: dec(p.amount),
      paymentDate: iso(p.paymentDate),
      reversedAt: iso(p.reversedAt),
    })),
    installments: installments.map((i) => ({
      id: i.id,
      paymentPlanId: i.paymentPlanId,
      saleId: i.paymentPlan.saleId,
      sequenceNumber: i.sequenceNumber,
      name: i.name,
      amount: dec(i.amount),
      paidAmount: dec(i.paidAmount),
      currency: i.paymentPlan.currency,
      dueDate: iso(i.dueDate),
      status: i.status,
    })),
    documents: documents.map((d) => ({
      ...d,
      createdAt: iso(d.createdAt),
    })),
  };
}
