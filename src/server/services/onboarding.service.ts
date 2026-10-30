import "server-only";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";

export type OrganizationType = "INVESTOR" | "AGENCY" | "MANAGER";

/**
 * Onboarding service.
 *
 * The checklist is always recomputed from real data — the operator
 * cannot mark a step "done" if the underlying entity doesn't exist,
 * and cannot un-do a step that has already produced data. The two
 * `OrganizationProfile.onboardingCompletedAt` / `onboardingDismissedAt`
 * flags only control **visibility** of the checklist:
 *
 *   - `dismissedAt` → operator hid the panel (opt-out) but the wizard
 *     is still linkable from settings.
 *   - `completedAt` → auto-stamped once all 4 steps report done, so we
 *     stop showing the "Get started" nag.
 */

export type OnboardingStepKey =
  | "profile"
  | "project"
  | "units"
  | "team"
  // Manager-specific keys. Reusing "team" keeps the invite step.
  | "building"
  | "managedUnits"
  | "tariffs"
  | "paymentAccount";

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allDone: boolean;
  completedAt: Date | null;
  dismissedAt: Date | null;
  visible: boolean;
}

export async function loadOnboardingState(
  organizationId: string,
  organizationType: OrganizationType = "INVESTOR",
): Promise<OnboardingState> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: {
      legalName: true,
      logoUrl: true,
      onboardingCompletedAt: true,
      onboardingDismissedAt: true,
    },
  });

  // "Profile done" = the operator has entered a legal name AND uploaded
  // a logo. The legal name lands during org creation, so the logo is
  // the real check.
  const profileDone = Boolean(profile?.legalName && profile.logoUrl);

  let steps: OnboardingStep[];
  if (organizationType === "MANAGER") {
    steps = await loadManagerSteps(organizationId, profileDone);
  } else {
    steps = await loadInvestorAgencySteps(organizationId, profileDone);
  }

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const allDone = completedCount === totalCount;

  // If everything is done but `completedAt` isn't stamped yet, stamp it
  // once — this is cheap and self-healing.
  if (allDone && profile && !profile.onboardingCompletedAt) {
    try {
      await prisma.organizationProfile.update({
        where: { organizationId },
        data: { onboardingCompletedAt: new Date() },
      });
    } catch {
      // Non-critical; the panel just keeps showing until next load.
    }
  }

  const dismissedAt = profile?.onboardingDismissedAt ?? null;
  const completedAt = profile?.onboardingCompletedAt ?? null;

  return {
    steps,
    completedCount,
    totalCount,
    allDone,
    completedAt,
    dismissedAt,
    // Show the checklist while the operator has not dismissed it AND
    // hasn't completed all steps.
    visible: !dismissedAt && !allDone,
  };
}

export async function dismissOnboarding(
  organizationId: string,
  actorUserId: string,
): Promise<void> {
  const profile = await prisma.organizationProfile.findUnique({
    where: { organizationId },
    select: { onboardingDismissedAt: true },
  });
  if (!profile) return;
  if (profile.onboardingDismissedAt) return;

  await prisma.organizationProfile.update({
    where: { organizationId },
    data: { onboardingDismissedAt: new Date() },
  });
  await recordAudit({
    action: "onboarding.dismissed",
    entityType: "OrganizationProfile",
    entityId: organizationId,
    organizationId,
    actorUserId,
  });
}

export async function resurfaceOnboarding(
  organizationId: string,
  actorUserId: string,
): Promise<void> {
  await prisma.organizationProfile.update({
    where: { organizationId },
    data: { onboardingDismissedAt: null },
  });
  await recordAudit({
    action: "onboarding.resurfaced",
    entityType: "OrganizationProfile",
    entityId: organizationId,
    organizationId,
    actorUserId,
  });
}

// ---------------------------------------------------------------------------
// Per-org-type step builders — invoked from `loadOnboardingState`.
// ---------------------------------------------------------------------------

async function loadInvestorAgencySteps(
  organizationId: string,
  profileDone: boolean,
): Promise<OnboardingStep[]> {
  const [projectsCount, unitsCount, membersCount] = await Promise.all([
    prisma.project.count({ where: { organizationId, archivedAt: null } }),
    prisma.unit.count({ where: { organizationId, archivedAt: null } }),
    prisma.member.count({ where: { organizationId } }),
  ]);

  return [
    {
      key: "profile",
      label: "Podaci firme i logo",
      hint: "Otpremite logo i unesite pravni naziv koji će se videti u ponudama i ugovorima.",
      href: "/podesavanja/organizacija",
      done: profileDone,
    },
    {
      key: "project",
      label: "Prvi projekat",
      hint: "Kreirajte projekat u koji ćete uneti jedinice.",
      href: "/projekti/novi",
      done: projectsCount > 0,
    },
    {
      key: "units",
      label: "Jedinice",
      hint: "Dodajte prvu jedinicu ili uvezite ceo cenovnik iz Excela.",
      href: "/jedinice",
      done: unitsCount > 0,
    },
    {
      key: "team",
      label: "Pozovite tim",
      hint: "Dodajte kolege ili agencijskog partnera da rade sa vama.",
      href: "/podesavanja/tim",
      done: membersCount > 1,
    },
  ];
}

/**
 * Faza 11 — MANAGER onboarding branch. Each step reads real data so an
 * operator can't check off something that doesn't exist, and once a
 * building/unit is created the step stays done forever (not toggled).
 */
async function loadManagerSteps(
  organizationId: string,
  profileDone: boolean,
): Promise<OnboardingStep[]> {
  const [buildingsCount, managedUnitsCount, tariffsCount, membersCount, buildingWithAccount] =
    await Promise.all([
      prisma.managedBuilding.count({ where: { organizationId, archivedAt: null } }),
      prisma.managedUnit.count({ where: { organizationId, archivedAt: null } }),
      prisma.duesTariff.count({ where: { organizationId } }),
      prisma.member.count({ where: { organizationId } }),
      prisma.managedBuilding.findFirst({
        where: {
          organizationId,
          archivedAt: null,
          paymentAccountNumber: { not: null },
        },
        select: { id: true },
      }),
    ]);

  return [
    {
      key: "profile",
      label: "Podaci upravnika i logo",
      hint: "Otpremite logo i unesite pravni naziv koji će se videti na uplatnicama i zapisnicima.",
      href: "/podesavanja/organizacija",
      done: profileDone,
    },
    {
      key: "building",
      label: "Prva zgrada",
      hint: "Dodajte prvu zgradu koju upravljate i unesite osnovne podatke.",
      href: "/zgrade",
      done: buildingsCount > 0,
    },
    {
      key: "managedUnits",
      label: "Posebni delovi (stanovi)",
      hint: "Dodajte stanove, poslovne prostore, garaže i ostale posebne delove u zgradi.",
      href: "/zgrade",
      done: managedUnitsCount > 0,
    },
    {
      key: "tariffs",
      label: "Tarife zajedničke takse",
      hint: "Definišite tarife po m²/jedinici za generisanje mesečnih zaduženja.",
      href: "/zgrade/tarife",
      done: tariffsCount > 0,
    },
    {
      key: "paymentAccount",
      label: "Račun zgrade za uplatnice",
      hint: "Unesite broj računa zgrade da bi uplatnice i IPS QR imale pravu adresu primaoca.",
      href: "/zgrade",
      done: Boolean(buildingWithAccount),
    },
    {
      key: "team",
      label: "Pozovite tim",
      hint: "Dodajte računovođu, tehničare ili pomoćnog upravnika.",
      href: "/podesavanja/tim",
      done: membersCount > 1,
    },
  ];
}
