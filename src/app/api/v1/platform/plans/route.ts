import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  createSaaSPlan,
  listSaaSPlans,
} from "@/server/services/platform.service";

const createSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Oznaka može sadržati samo mala slova, brojeve i crticu."),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  monthlyPrice: z.number().min(0),
  quarterlyPrice: z.number().min(0).optional().nullable(),
  semiAnnualPrice: z.number().min(0).optional().nullable(),
  annualPrice: z.number().min(0).optional().nullable(),
  onboardingFee: z.number().min(0).optional().nullable(),
  currency: z.string().min(3).max(3),
  maxActiveProjects: z.number().int().min(0).optional().nullable(),
  maxUnits: z.number().int().min(0).optional().nullable(),
  maxMembers: z.number().int().min(0).optional().nullable(),
  maxAgencyConnections: z.number().int().min(0).optional().nullable(),
  features: z.record(z.string(), z.unknown()).optional(),
  active: z.boolean().optional(),
  publiclyAvailable: z.boolean().optional(),
  recommended: z.boolean().optional(),
  defaultTrialDays: z.number().int().min(0).max(365).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const GET = apiHandler({}, async () => {
  await requireSuperAdmin();
  const plans = await listSaaSPlans();
  return { data: plans };
});

export const POST = apiHandler(
  { bodySchema: createSchema },
  async ({ body }) => {
    const ctx = await requireSuperAdmin();
    const plan = await createSaaSPlan(body, ctx.session.user.id);
    return { data: plan, status: 201 };
  },
);
