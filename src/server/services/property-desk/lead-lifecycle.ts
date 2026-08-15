import type {
  MarketingLeadLevel,
  MarketingLeadStage,
  PropertyDeskTeamRole,
} from "@prisma/client";

/**
 * Property Desk pipeline lifecycle — single source of truth.
 *
 * Umesto da razne komponente ponovo izmišljaju „koji stage pripada kom
 * levelu", „koji su sledeći dozvoljeni stage-ovi za ovu rolu" i sl., sve
 * takve odluke se drže ovde. Server i klijent ga uvoze na tipovanjima
 * (klijent samo za konstante), tako da UI ne može da ponudi tranziciju
 * koju server ne bi propustio.
 *
 * Pravila:
 *  - Pipeline je forward-only. Svaki stage ima taksativan skup sledećih
 *    stage-ova u kojima može da završi. Sve što nije ovde traži
 *    `pd_lead.reopen` (default MANAGER + SUPER_ADMIN).
 *  - Level je izračunljiv iz stage-a (`computeLevel`). Kad se lead
 *    promeni stage koji spada u drugi level, servis auto-unassign-uje
 *    lead i emituje SYSTEM activity red.
 *  - Terminalno stanje LOST vodi u level ARCHIVED. NURTURING je „park"
 *    unutar L1 (SOURCING) — iz njega se vraća na CONTACTED.
 */

export const STAGE_TO_LEVEL: Record<MarketingLeadStage, MarketingLeadLevel> = {
  NEW: "SOURCING",
  CONTACTED: "SOURCING",
  QUALIFIED: "SOURCING",
  NURTURING: "SOURCING",
  DEMO: "CLOSING",
  PROPOSAL: "CLOSING",
  WON: "OPERATIONS",
  LOST: "ARCHIVED",
};

/**
 * Level(i) u kojima svaka PD rola „radi". SETTER vidi SOURCING, CLOSER
 * CLOSING itd. MANAGER vidi sve. Ovo je defaultni filter — nadskup
 * korisnika koji imaju `pd_lead.view_team` uvek vidi sve.
 */
export const ROLE_LEVELS: Record<PropertyDeskTeamRole, MarketingLeadLevel[]> = {
  SETTER: ["SOURCING"],
  CLOSER: ["CLOSING"],
  OPERATIONS: ["OPERATIONS"],
  MANAGER: ["SOURCING", "CLOSING", "OPERATIONS", "ARCHIVED"],
};

/**
 * Dozvoljene forward tranzicije. Prazan niz = terminalno stanje (LOST).
 * NURTURING se namerno vraća na CONTACTED — to je „park" a ne unazad.
 *
 * Kad promena nije u ovoj mapi, servis zahteva `pd_lead.reopen` + razlog.
 */
export const FORWARD_TRANSITIONS: Record<
  MarketingLeadStage,
  MarketingLeadStage[]
> = {
  NEW: ["CONTACTED", "NURTURING", "LOST"],
  CONTACTED: ["QUALIFIED", "NURTURING", "LOST"],
  QUALIFIED: ["DEMO", "NURTURING", "LOST"],
  NURTURING: ["CONTACTED", "QUALIFIED", "LOST"],
  DEMO: ["PROPOSAL", "LOST"],
  PROPOSAL: ["WON", "LOST"],
  WON: [],
  LOST: [],
};

/**
 * Level u kome se lead nalazi za dati stage.
 */
export function computeLevel(stage: MarketingLeadStage): MarketingLeadLevel {
  return STAGE_TO_LEVEL[stage];
}

/**
 * Da li je prelaz `from → to` unutar forward pravila. Vraća `true` i
 * kada je `from === to` (no-op se ne smatra reopen-om).
 */
export function isForwardTransition(
  from: MarketingLeadStage,
  to: MarketingLeadStage,
): boolean {
  if (from === to) return true;
  return FORWARD_TRANSITIONS[from].includes(to);
}

/**
 * Koje stage-ove korisnik sme da postavi kao sledeće, uzimajući u obzir
 * i rolu. MANAGER i SUPER_ADMIN (`role === null`) dobijaju pun skup
 * (svi stage-ovi osim onih koji su strogo terminalni ili u drugom
 * levelu — filter se svodi na forward tranzicije + LOST).
 */
export function nextAllowedStages(
  current: MarketingLeadStage,
  role: PropertyDeskTeamRole | null,
): MarketingLeadStage[] {
  const forward = FORWARD_TRANSITIONS[current];
  if (role === null || role === "MANAGER") return forward;
  const levelsForRole = new Set<MarketingLeadLevel>(ROLE_LEVELS[role]);
  // Rola sme da završi lead unutar svog levela ili da ga „preda" u
  // sledeći level ako je taj sledeći stage forward tranzicija (npr.
  // Setter može da klikne QUALIFIED → DEMO da preda leada u L2 pool).
  return forward.filter((next) => {
    const nextLevel = STAGE_TO_LEVEL[next];
    if (nextLevel === "ARCHIVED") return true;
    if (levelsForRole.has(nextLevel)) return true;
    // Prelaz u naredni level je uvek ok (predaja) — sistem će auto-
    // -unassign kad promena levela padne u servis.
    return true;
  });
}

/**
 * Skup svih level-a koji ova rola prirodno pokriva (bez override-a).
 * Koristi se u `buildMarketingLeadScopeFilter` da filtrira listu.
 */
export function levelsForRole(
  role: PropertyDeskTeamRole,
): MarketingLeadLevel[] {
  return ROLE_LEVELS[role];
}

/**
 * `true` ako promena stage-a menja i level (auto-unassign trigger).
 */
export function stageChangeCrossesLevel(
  from: MarketingLeadStage,
  to: MarketingLeadStage,
): boolean {
  return STAGE_TO_LEVEL[from] !== STAGE_TO_LEVEL[to];
}
