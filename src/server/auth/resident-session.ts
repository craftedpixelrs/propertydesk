import "server-only";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

import { prisma } from "@/server/db/prisma";
import { serverEnv } from "@/lib/env";

/**
 * Faza 11 — Resident portal "session" is a signed cookie carrying the
 * `ResidentAccess.id`. We deliberately do NOT create a Better-Auth `User`
 * for residents — they live in `BuildingPerson`, don't consume org seats,
 * and must never be able to log into the manager app.
 *
 * The cookie is HMAC-signed with `serverEnv.AUTH_SECRET` so a tampered id
 * can't masquerade as a different ResidentAccess. We don't need encryption
 * because the plaintext (an opaque cuid) carries no PII.
 */

const COOKIE = "pd_resident";
const MAX_AGE_DAYS = 60;

function sign(value: string): string {
  return createHmac("sha256", serverEnv.BETTER_AUTH_SECRET).update(value).digest("hex");
}

export async function setResidentSessionCookie(accessId: string): Promise<void> {
  const token = `${accessId}.${sign(accessId)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 3_600,
  });
}

export async function clearResidentSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export interface ResidentSessionContext {
  accessId: string;
  organizationId: string;
  unitId: string;
  buildingId: string;
  personId: string;
  email: string;
}

export async function getResidentSession(): Promise<ResidentSessionContext | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [accessId, sig] = raw.split(".");
  if (!accessId || !sig) return null;
  if (sig !== sign(accessId)) return null;
  const access = await prisma.residentAccess.findFirst({
    where: { id: accessId, status: "ACTIVE" },
    include: { unit: { select: { id: true, buildingId: true } } },
  });
  if (!access) return null;
  return {
    accessId: access.id,
    organizationId: access.organizationId,
    unitId: access.unitId,
    buildingId: access.unit.buildingId,
    personId: access.personId,
    email: access.email,
  };
}

/**
 * Get every active ResidentAccess for the signed-in resident's email.
 * Lets a single login reveal every unit the person owns across buildings.
 */
export async function listResidentUnitsForSession(session: ResidentSessionContext) {
  return prisma.residentAccess.findMany({
    where: { email: session.email, status: "ACTIVE" },
    include: {
      unit: {
        include: {
          building: { select: { id: true, name: true, address: true, city: true } },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });
}
