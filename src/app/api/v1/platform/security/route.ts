import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { apiHandler } from "@/lib/api/handler";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  getTwoFactorRequired,
  setTwoFactorRequired,
  userHasTwoFactor,
} from "@/server/services/security/two-factor-policy";

const patchSchema = z.object({
  twoFactorRequired: z.boolean(),
});

export const GET = apiHandler({}, async () => {
  const ctx = await requireSuperAdmin();
  const [twoFactorRequired, callerEnabled] = await Promise.all([
    getTwoFactorRequired(),
    userHasTwoFactor(ctx.session.user.id),
  ]);
  return { data: { twoFactorRequired, callerEnabled } };
});

export const PATCH = apiHandler({ bodySchema: patchSchema }, async ({ body }) => {
  const ctx = await requireSuperAdmin();
  if (body.twoFactorRequired && !(await userHasTwoFactor(ctx.session.user.id))) {
    throw new ApiError(
      "TWO_FACTOR_SETUP_REQUIRED",
      "Prvo uključite 2FA na svom nalogu, pa tek onda obavezu za ostale.",
    );
  }
  await setTwoFactorRequired(body.twoFactorRequired);
  return { data: { twoFactorRequired: body.twoFactorRequired } };
});
