import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { paginate } from "@/lib/api/query";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  createOrganizationByPlatformAdmin,
  listAllOrganizations,
} from "@/server/services/platform.service";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug može sadržati samo mala slova, brojeve i crticu."),
  type: z.enum(["INVESTOR", "AGENCY"]),
  legalName: z.string().min(2).max(200),
  displayName: z.string().min(2).max(120),
  registrationNumber: z.string().max(60).optional().nullable(),
  taxNumber: z.string().max(60).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(120).optional().nullable(),
  website: z.string().url().optional().nullable(),
  planCode: z.string().min(1).max(60),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CLOSED"]).optional(),
  trialDays: z.number().int().min(0).max(365).optional().nullable(),
});

export const GET = apiHandler({}, async ({ query, searchParams }) => {
  const ctx = await requireSuperAdmin();
  const type = searchParams.get("filter[type]");
  const status = searchParams.get("filter[status]");

  const { items, total } = await listAllOrganizations({
    page: query.page,
    pageSize: query.pageSize,
    search: query.q,
    type: (type as "INVESTOR" | "AGENCY" | null) ?? undefined,
    status:
      (status as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CLOSED" | null) ??
      undefined,
  });

  const { items: pageItems, pagination } = paginate(
    items,
    query.page,
    query.pageSize,
    total,
  );

  return {
    data: pageItems,
    meta: { pagination, actor: { userId: ctx.session.user.id } },
  };
});

export const POST = apiHandler({ bodySchema: createSchema }, async ({ body }) => {
  const ctx = await requireSuperAdmin();
  const result = await createOrganizationByPlatformAdmin(body, ctx.session.user.id);
  return { data: { id: result.org.id, slug: result.org.slug }, status: 201 };
});
