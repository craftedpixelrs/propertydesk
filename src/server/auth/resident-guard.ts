import "server-only";
import { redirect } from "next/navigation";

import { getResidentSession, type ResidentSessionContext } from "@/server/auth/resident-session";

/**
 * Guard for `/stanar/*` pages. If no active resident session is bound,
 * redirect to the "sign in required" page explaining that an invite is
 * needed. Pages ALWAYS go through this helper so they can rely on a
 * non-null session in the rest of their render logic.
 */
export async function requireResidentSession(): Promise<ResidentSessionContext> {
  const session = await getResidentSession();
  if (!session) redirect("/stanar/potreban-pristup");
  return session;
}
