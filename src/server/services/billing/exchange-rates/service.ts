import "server-only";

import Decimal from "decimal.js";
import { Prisma } from "@prisma/client";
import type { ExchangeRate, ExchangeRateSource } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";
import { DomainErrors } from "@/lib/errors";
import { toDecimal, type MoneyInput } from "@/lib/formatters/money";

/**
 * Exchange-rate service.
 *
 * Domestic (Serbian) clients often require SaaS invoices in dinarska
 * protivvrednost even though our plans are priced in EUR. This service
 * owns the manually-maintained rate list (EUR → RSD by default) and the
 * lookup used by `issueInvoice`.
 *
 * Semantics:
 *   - A row means "on and after `effectiveDate`, 1 baseCurrency = rate
 *     quoteCurrency". The lookup picks the newest row with
 *     `effectiveDate <= issueDate` — the same rule Serbian tax law uses
 *     ("srednji kurs na dan izdavanja fakture").
 *   - `MANUAL` rows are entered by SUPER_ADMIN; `NBS` is reserved for a
 *     future automation (see `fetchNbsMiddleRate`) but the persistence
 *     shape is the same.
 *   - Rates are `Decimal(18,6)` — we need the extra precision because
 *     the multiplier is applied to invoice totals in the thousands.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export const DEFAULT_BASE_CURRENCY = "EUR" as const;
export const DEFAULT_QUOTE_CURRENCY = "RSD" as const;

export interface ExchangeRatePair {
  baseCurrency?: string;
  quoteCurrency?: string;
}

export interface ListExchangeRatesInput extends ExchangeRatePair {
  /** Cap the number of rows returned (newest first). Defaults to 200. */
  limit?: number;
}

export interface CreateExchangeRateInput extends ExchangeRatePair {
  effectiveDate: Date;
  rate: MoneyInput;
  source?: ExchangeRateSource;
  note?: string | null;
}

export interface GetRateForDateInput extends ExchangeRatePair {
  /** Date the invoice is being issued for. Defaults to now. */
  date?: Date;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizePair(input: ExchangeRatePair) {
  const baseCurrency = (input.baseCurrency ?? DEFAULT_BASE_CURRENCY).toUpperCase();
  const quoteCurrency = (input.quoteCurrency ?? DEFAULT_QUOTE_CURRENCY).toUpperCase();
  if (baseCurrency === quoteCurrency) {
    throw DomainErrors.badRequest(
      "Osnovna i ciljana valuta ne mogu biti iste.",
    );
  }
  return { baseCurrency, quoteCurrency };
}

/** Strip time-of-day so a rate applies to the whole calendar day. */
function toEffectiveDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export async function listExchangeRates(
  input: ListExchangeRatesInput = {},
): Promise<ExchangeRate[]> {
  const { baseCurrency, quoteCurrency } = normalizePair(input);
  return prisma.exchangeRate.findMany({
    where: { baseCurrency, quoteCurrency },
    orderBy: { effectiveDate: "desc" },
    take: Math.max(1, Math.min(input.limit ?? 200, 1000)),
  });
}

/**
 * Return the exchange rate that applies to `date` — the newest row with
 * `effectiveDate <= date`. Throws a helpful Serbian error when no such row
 * exists, because that is a fatal condition for an issuer trying to bill
 * a domestic client.
 */
export async function getRateForDate(
  input: GetRateForDateInput,
): Promise<ExchangeRate> {
  const { baseCurrency, quoteCurrency } = normalizePair(input);
  const effective = toEffectiveDate(input.date ?? new Date());
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      quoteCurrency,
      effectiveDate: { lte: effective },
    },
    orderBy: { effectiveDate: "desc" },
  });
  if (!rate) {
    throw DomainErrors.invalidState(
      `Nema kursa za ${baseCurrency}/${quoteCurrency} na dan ${effective
        .toISOString()
        .slice(0, 10)}. Unesite kurs u kursnoj listi pa pokušajte ponovo.`,
    );
  }
  return rate;
}

// -----------------------------------------------------------------------------
// Conversion
// -----------------------------------------------------------------------------

/**
 * Convert a money amount using the given rate. Rounds to 2 decimals — the
 * same precision as our invoice columns.
 */
export function convertAmount(
  amount: MoneyInput,
  rate: MoneyInput,
): Decimal {
  return toDecimal(amount).times(toDecimal(rate)).toDecimalPlaces(2);
}

// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export async function createExchangeRate(
  input: CreateExchangeRateInput,
  actorUserId: string | null,
): Promise<ExchangeRate> {
  const { baseCurrency, quoteCurrency } = normalizePair(input);
  const rateDec = toDecimal(input.rate);
  if (!rateDec.isFinite() || rateDec.lessThanOrEqualTo(0)) {
    throw DomainErrors.badRequest("Kurs mora biti pozitivan broj.");
  }
  const effectiveDate = toEffectiveDate(input.effectiveDate);

  try {
    const created = await prisma.exchangeRate.create({
      data: {
        baseCurrency,
        quoteCurrency,
        rate: new Prisma.Decimal(rateDec.toString()),
        effectiveDate,
        source: input.source ?? "MANUAL",
        note: input.note ?? null,
        createdByUserId: actorUserId ?? null,
      },
    });

    await recordAudit({
      action: "billing.exchange_rate_created",
      entityType: "ExchangeRate",
      entityId: created.id,
      actorUserId,
      newValues: {
        baseCurrency,
        quoteCurrency,
        rate: created.rate,
        effectiveDate: created.effectiveDate,
        source: created.source,
      },
    });

    return created;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw DomainErrors.conflict(
        `Kurs za ${baseCurrency}/${quoteCurrency} na dan ${effectiveDate
          .toISOString()
          .slice(0, 10)} već postoji.`,
      );
    }
    throw err;
  }
}

export async function deleteExchangeRate(
  id: string,
  actorUserId: string | null,
): Promise<void> {
  const existing = await prisma.exchangeRate.findUnique({ where: { id } });
  if (!existing) throw DomainErrors.notFound("Kurs");

  await prisma.exchangeRate.delete({ where: { id } });

  await recordAudit({
    action: "billing.exchange_rate_deleted",
    entityType: "ExchangeRate",
    entityId: id,
    actorUserId,
    previousValues: {
      baseCurrency: existing.baseCurrency,
      quoteCurrency: existing.quoteCurrency,
      rate: existing.rate,
      effectiveDate: existing.effectiveDate,
    },
  });
}

// -----------------------------------------------------------------------------
// NBS automation stub — extension point
// -----------------------------------------------------------------------------

/**
 * Fetch the NBS middle rate for a given date. Not implemented yet — the
 * `ExchangeRateSource.NBS` enum value and this function reserve the shape
 * so a future cron job can pre-populate the list from
 * https://webservices.nbs.rs (or the public JSON feed).
 *
 * When implemented, it should:
 *   1. Call NBS with the target date.
 *   2. Upsert the row with `source = NBS`.
 *   3. Never overwrite a `MANUAL` row for the same date.
 */
export async function fetchNbsMiddleRate(
  _date: Date,
  _pair: ExchangeRatePair = {},
): Promise<ExchangeRate> {
  throw DomainErrors.invalidState(
    "Automatsko povlačenje sa NBS-a još nije implementirano. Unesite kurs ručno u kursnoj listi.",
  );
}
