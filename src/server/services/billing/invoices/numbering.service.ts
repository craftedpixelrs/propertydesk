import "server-only";
import { createId } from "@paralleldrive/cuid2";
import type { BillingSequenceScope } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { DomainErrors } from "@/lib/errors";

/**
 * Concurrency-safe invoice numbering.
 *
 * `allocateInvoiceNumber` runs inside a `SERIALIZABLE`-safe critical section:
 *   1. `SELECT ... FOR UPDATE` on the sequence row (creating it if missing).
 *   2. Increment `nextValue`.
 *   3. Format the number using the caller's template.
 *
 * The `Invoice.invoiceNumber` column has a UNIQUE constraint that acts as a
 * belt-and-braces guard if two callers ever squeeze past the row lock — the
 * second INSERT will fail and can be retried.
 *
 * IMPORTANT: this function does its own transaction. Callers must NOT pass
 * a pre-existing `tx`, otherwise the lock would be released too early.
 */

export interface AllocateInvoiceNumberInput {
  scope: BillingSequenceScope;
  format: string;
  organizationId?: string | null;
  organizationCode?: string | null;
  now?: Date;
}

export async function allocateInvoiceNumber(
  input: AllocateInvoiceNumberInput,
): Promise<{ number: string; sequenceValue: number }> {
  const now = input.now ?? new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1..12
  const orgId =
    input.scope === "ORG_YEARLY" || input.scope === "ORG_MONTHLY"
      ? input.organizationId ?? null
      : null;
  const monthKey =
    input.scope === "GLOBAL_MONTHLY" || input.scope === "ORG_MONTHLY" ? month : null;

  if ((input.scope === "ORG_YEARLY" || input.scope === "ORG_MONTHLY") && !orgId) {
    throw DomainErrors.badRequest(
      "organizationId je obavezan za per-org šemu numeracije faktura.",
    );
  }

  return await prisma.$transaction(async (tx) => {
    // Serialize concurrent allocators by taking a Postgres advisory lock
    // hashed from the scope key. `hashtextextended` deterministically maps
    // the key to a bigint, so racing INSERTs stack up on the same lock
    // regardless of whether the sequence row already exists.
    const key = `bs:${input.scope}:${orgId ?? "-"}:${year}:${monthKey ?? "-"}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;

    // Find or create.
    let row = await tx.billingSequence.findFirst({
      where: { scope: input.scope, organizationId: orgId, year, month: monthKey },
    });
    if (!row) {
      row = await tx.billingSequence.create({
        data: {
          id: createId(),
          scope: input.scope,
          organizationId: orgId,
          year,
          month: monthKey,
          nextValue: 1,
        },
      });
    }

    const sequenceValue = row.nextValue;
    await tx.billingSequence.update({
      where: { id: row.id },
      data: { nextValue: sequenceValue + 1 },
    });

    const number = renderInvoiceNumber(input.format, {
      year,
      month,
      seq: sequenceValue,
      orgCode: input.organizationCode ?? null,
    });

    return { number, sequenceValue };
  });
}

/**
 * Render a formatted invoice number from a template.
 * Supported tokens: {YYYY}, {YY}, {MM}, {ORG}, {SEQ}, {SEQ:N}.
 */
export function renderInvoiceNumber(
  format: string,
  ctx: { year: number; month: number; seq: number; orgCode: string | null },
): string {
  return format.replace(/\{([A-Z]+)(?::(\d{1,2}))?\}/g, (_match, token, arg) => {
    switch (token) {
      case "YYYY":
        return String(ctx.year);
      case "YY":
        return String(ctx.year).slice(-2);
      case "MM":
        return String(ctx.month).padStart(2, "0");
      case "ORG":
        return ctx.orgCode ? sanitizeOrgCode(ctx.orgCode) : "";
      case "SEQ": {
        const width = arg ? Math.max(1, Math.min(10, Number.parseInt(arg, 10))) : 1;
        return String(ctx.seq).padStart(width, "0");
      }
      default:
        return "";
    }
  });
}

function sanitizeOrgCode(code: string): string {
  return code
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}
