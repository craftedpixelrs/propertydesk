import { prisma } from "@/server/db/prisma";

const SETTINGS_ID = "default";

export async function getTwoFactorRequired(): Promise<boolean> {
  const row = await prisma.platformSecuritySettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { twoFactorRequired: true },
  });
  return row?.twoFactorRequired ?? false;
}

export async function setTwoFactorRequired(required: boolean): Promise<void> {
  await prisma.platformSecuritySettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, twoFactorRequired: required },
    update: { twoFactorRequired: required },
  });
}

export async function userHasTwoFactor(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  return Boolean(user?.twoFactorEnabled);
}
