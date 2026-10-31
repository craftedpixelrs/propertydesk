import Decimal from "decimal.js";
import type { AgendaItemMajority, AgendaItemVoteKind } from "@prisma/client";

/**
 * Kvorum skupštine: prisutno učešće mora biti veće od polovine
 * ukupnog učešća zgrade. Učešće je `participationShare` posebnog dela.
 */
export function sharesMeetQuorum(present: Decimal, total: Decimal): boolean {
  return total.gt(0) && present.mul(2).gt(total);
}

export function decisionPassed(args: {
  voteKind: AgendaItemVoteKind;
  majority: AgendaItemMajority;
  yes: Decimal;
  no: Decimal;
  abstain: Decimal;
  totalShares: Decimal;
  quorumMet: boolean;
}): boolean | null {
  if (args.voteKind === "INFORMATION") return null;
  if (!args.quorumMet) return false;
  if (args.yes.lte(0)) return false;
  const castTotal = args.yes.plus(args.no).plus(args.abstain);
  switch (args.majority) {
    case "SIMPLE":
      return castTotal.gt(0) && args.yes.mul(2).gt(castTotal);
    case "ABSOLUTE":
      return args.totalShares.gt(0) && args.yes.mul(2).gt(args.totalShares);
    case "TWO_THIRDS":
      return args.totalShares.gt(0) && args.yes.mul(3).gte(args.totalShares.mul(2));
    default:
      return false;
  }
}
