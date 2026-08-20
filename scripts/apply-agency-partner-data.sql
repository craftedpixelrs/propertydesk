-- Agency partner data fix. Idempotent. No schema changes.
-- 1) Ensure saas_plan.code = 'partner'
-- 2) Point every AGENCY org at that plan; clear trial/billing lock
--    (leave SUSPENDED / CLOSED as the admin set them)

INSERT INTO "saas_plan" (
  id, code, name, description, "monthlyPrice", currency,
  "maxActiveProjects", "maxUnits", "maxMembers", "maxAgencyConnections",
  features, active, "publiclyAvailable", recommended, "sortOrder",
  "createdAt", "updatedAt"
)
SELECT
  'plan_partner_' || substr(md5('propertydesk-partner-plan'), 1, 16),
  'partner',
  'Partner',
  'Besplatan portal agencije. Pristup ide preko poziva investitora, bez pretplate.',
  0,
  'EUR',
  0,
  0,
  25,
  NULL,
  '{"audience":"agency","agencySharing":true,"whiteLabel":false}'::jsonb,
  TRUE,
  FALSE,
  FALSE,
  20,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "saas_plan" WHERE code = 'partner');

UPDATE "saas_plan"
SET
  name = 'Partner',
  description = 'Besplatan portal agencije. Pristup ide preko poziva investitora, bez pretplate.',
  "monthlyPrice" = 0,
  "maxActiveProjects" = 0,
  "maxUnits" = 0,
  "maxMembers" = 25,
  "maxAgencyConnections" = NULL,
  features = '{"audience":"agency","agencySharing":true,"whiteLabel":false}'::jsonb,
  active = TRUE,
  "publiclyAvailable" = FALSE,
  "sortOrder" = 20,
  "updatedAt" = NOW()
WHERE code = 'partner';

UPDATE "organization_profile"
SET
  status = 'ACTIVE',
  "updatedAt" = NOW()
WHERE type = 'AGENCY'
  AND status NOT IN ('SUSPENDED', 'CLOSED');

UPDATE "organization_subscription" AS os
SET
  "planId" = p.id,
  status = CASE
    WHEN op.status = 'SUSPENDED' THEN 'SUSPENDED'::"SubscriptionStatus"
    WHEN op.status = 'CLOSED' THEN 'CANCELED'::"SubscriptionStatus"
    ELSE 'ACTIVE'::"SubscriptionStatus"
  END,
  "trialStartsAt" = NULL,
  "trialEndsAt" = NULL,
  "autoRenew" = FALSE,
  "nextBillingDate" = NULL,
  "price" = 0,
  "customPrice" = FALSE,
  "updatedAt" = NOW()
FROM "organization_profile" AS op
CROSS JOIN "saas_plan" AS p
WHERE os."organizationId" = op."organizationId"
  AND op.type = 'AGENCY'
  AND p.code = 'partner';
