import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import { setOrganizationStatus } from "@/server/services/platform.service";

const bodySchema = z.object({
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CLOSED"]),
  reason: z.string().max(500).optional(),
});

const paramsSchema = z.object({ id: z.string().min(1) });

export const PATCH = apiHandler(
  { bodySchema, paramsSchema },
  async ({ body, params }) => {
    const ctx = await requireSuperAdmin();
    await setOrganizationStatus(
      params.id,
      body.status,
      ctx.session.user.id,
      body.reason,
    );
    return { data: { ok: true } };
  },
);
