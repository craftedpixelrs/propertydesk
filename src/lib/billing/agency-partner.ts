/** Free partner seat. Agencies do not buy Starter/Growth/Scale. */
export const AGENCY_PARTNER_PLAN_CODE = "partner";

export function isAgencyPartnerPlan(code: string | null | undefined): boolean {
  return (code ?? "").trim().toLowerCase() === AGENCY_PARTNER_PLAN_CODE;
}

export function applyAgencyOrgDefaults<
  T extends {
    type: "INVESTOR" | "AGENCY";
    planCode?: string;
    status?: "TRIAL" | "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CLOSED";
    trialDays?: number | null;
  },
>(input: T): T {
  if (input.type !== "AGENCY") return input;
  const keepLock = input.status === "SUSPENDED" || input.status === "CLOSED";
  return {
    ...input,
    planCode: AGENCY_PARTNER_PLAN_CODE,
    status: keepLock ? input.status : "ACTIVE",
    trialDays: 0,
  };
}
