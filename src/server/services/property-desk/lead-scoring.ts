import type {
  LeadBudgetTier,
  LeadTemperature,
  LeadTimeline,
  MarketingLeadStage,
} from "@prisma/client";

/**
 * Property Desk lead-score — deterministic 0..100 helper.
 *
 * Dva sloja: (1) koliko je lead odmakao u pipeline-u, (2) koliko je
 * kvalifikovan (firma, budžet, timeline, donosilac odluke, temperatura).
 * Cap na 100.
 */

export interface LeadScoreInput {
  stage?: MarketingLeadStage | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  companySize?: number | null;
  budgetTier?: LeadBudgetTier | null;
  timelineHorizon?: LeadTimeline | null;
  decisionMakerName?: string | null;
  decisionMakerTitle?: string | null;
  temperature?: LeadTemperature | null;
}

/** Koliko pipeline napredak doprinosi score-u. LOST ne donosi poene. */
export const STAGE_SCORE: Record<MarketingLeadStage, number> = {
  NEW: 0,
  CONTACTED: 8,
  QUALIFIED: 15,
  NURTURING: 5,
  DEMO: 25,
  PROPOSAL: 35,
  WON: 45,
  LOST: 0,
};
const MAX_SCORE = 100;

export function computeLeadScore(input: LeadScoreInput): number {
  let score = 0;

  if (input.stage) {
    score += STAGE_SCORE[input.stage] ?? 0;
  }

  const hasCompanyName = Boolean(input.companyName && input.companyName.trim());
  const hasWebsite = Boolean(input.companyWebsite && input.companyWebsite.trim());
  if (hasCompanyName && hasWebsite) score += 10;

  const size = input.companySize ?? 0;
  if (size >= 50) score += 20;
  else if (size >= 10) score += 10;

  switch (input.budgetTier) {
    case "STARTER":
      score += 5;
      break;
    case "GROWTH":
      score += 15;
      break;
    case "ENTERPRISE":
      score += 25;
      break;
    default:
      break;
  }

  switch (input.timelineHorizon) {
    case "WITHIN_30D":
      score += 25;
      break;
    case "WITHIN_90D":
      score += 15;
      break;
    case "LATER":
      score += 5;
      break;
    default:
      break;
  }

  const hasDmName = Boolean(
    input.decisionMakerName && input.decisionMakerName.trim(),
  );
  const hasDmTitle = Boolean(
    input.decisionMakerTitle && input.decisionMakerTitle.trim(),
  );
  if (hasDmName && hasDmTitle) score += 10;

  switch (input.temperature) {
    case "HOT":
      score += 15;
      break;
    case "WARM":
      score += 8;
      break;
    default:
      break;
  }

  if (score < 0) score = 0;
  if (score > MAX_SCORE) score = MAX_SCORE;
  return score;
}
