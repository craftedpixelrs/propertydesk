-- Adds two nullable timestamps to `organization_profile` so the
-- /prvi-koraci onboarding wizard can persist "operator finished the
-- checklist" and "operator hid the checklist" as separate events.
--
-- The checklist itself is always recomputed from real data (does the
-- org have a project? at least one unit? another member?), so these
-- columns never carry business truth by themselves. Both are optional
-- so the migration is safe on populated tenants.
ALTER TABLE "organization_profile"
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
  ADD COLUMN "onboardingDismissedAt" TIMESTAMP(3);
