import "server-only";

import { prisma } from "@/server/db/prisma";
import { recordAudit } from "@/server/audit/audit";

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
  | "team";

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
): Promise<OnboardingState> {
  const [profile, projectsCount, unitsCount, membersCount] = await Promise.all([
    prisma.organizationProfile.findUnique({
      where: { organizationId },
      select: {
        legalName: true,
        logoUrl: true,
        onboardingCompletedAt: true,
        onboardingDismissedAt: true,
      },
    }),
    prisma.project.count({ where: { organizationId, archivedAt: null } }),
    prisma.unit.count({ where: { organizationId, archivedAt: null } }),
    prisma.member.count({ where: { organizationId } }),
  ]);

  // "Profile done" = the operator has entered a legal name AND uploaded
  // a logo. The legal name lands during org creation, so the logo is
  // the real check.
  const profileDone = Boolean(profile?.legalName && profile.logoUrl);

  const steps: OnboardingStep[] = [
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
