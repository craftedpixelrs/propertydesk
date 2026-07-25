import "server-only";
import type { AgencyCommissionRule } from "@prisma/client";

/**
 * Pure resolver for the commission-rule precedence hierarchy.
 *
 * Given all applicable `AgencyCommissionRule` rows for a given
 * (investor, agency, project, unit) tuple, this function returns the winner
 * according to the deterministic tier order:
 *
 *   1. unit + agency          (unitId set, agencyConnectionId set)
 *   2. project + agency       (projectId set, agencyConnectionId set)
 *   3. connection default     (only agencyConnectionId set)
 *   4. project default        (only projectId set)
 *
 * Within a tier ties are broken by newest `createdAt` — the most recent rule
 * wins. Rules outside their [validFrom, validTo] window are skipped.
 *
 * The resolver is pure so it can be unit-tested without a database.
 */

export type CommissionRuleTier =
  | "UNIT_AGENCY"
  | "PROJECT_AGENCY"
  | "CONNECTION_DEFAULT"
  | "PROJECT_DEFAULT";

export interface ResolveRuleContext {
  agencyConnectionId: string;
  projectId: string;
  unitId?: string | null;
  at?: Date;
}

export interface ResolvedRule {
  rule: AgencyCommissionRule;
  tier: CommissionRuleTier;
}

function isRuleInWindow(rule: AgencyCommissionRule, at: Date): boolean {
  if (rule.validFrom && rule.validFrom > at) return false;
  if (rule.validTo && rule.validTo < at) return false;
  return true;
}

function classify(
  rule: AgencyCommissionRule,
  ctx: ResolveRuleContext,
): CommissionRuleTier | null {
  const matchAgency = rule.agencyConnectionId === ctx.agencyConnectionId;
  const matchProject = rule.projectId === ctx.projectId;
  const matchUnit = ctx.unitId != null && rule.unitId === ctx.unitId;

  if (matchUnit && matchAgency) return "UNIT_AGENCY";
  if (rule.unitId == null && matchProject && matchAgency) return "PROJECT_AGENCY";
  if (rule.unitId == null && rule.projectId == null && matchAgency) return "CONNECTION_DEFAULT";
  if (rule.unitId == null && rule.agencyConnectionId == null && matchProject)
    return "PROJECT_DEFAULT";
  return null;
}

const TIER_PRIORITY: Record<CommissionRuleTier, number> = {
  UNIT_AGENCY: 4,
  PROJECT_AGENCY: 3,
  CONNECTION_DEFAULT: 2,
  PROJECT_DEFAULT: 1,
};

export function resolveCommissionRule(
  candidates: AgencyCommissionRule[],
  ctx: ResolveRuleContext,
): ResolvedRule | null {
  const at = ctx.at ?? new Date();
  let best: ResolvedRule | null = null;
  for (const rule of candidates) {
    if (!isRuleInWindow(rule, at)) continue;
    const tier = classify(rule, ctx);
    if (!tier) continue;
    if (
      !best ||
      TIER_PRIORITY[tier] > TIER_PRIORITY[best.tier] ||
      (TIER_PRIORITY[tier] === TIER_PRIORITY[best.tier] &&
        rule.createdAt > best.rule.createdAt)
    ) {
      best = { rule, tier };
    }
  }
  return best;
}
