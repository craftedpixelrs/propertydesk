import { NextResponse } from "next/server";

import { clearResidentSessionCookie } from "@/server/auth/resident-session";

/**
 * `POST /stanar/odjava` — resident sign-out. Clears the signed cookie
 * and sends them to a public confirmation page. GET works too so the
 * link is shareable from email templates.
 */
export async function POST(req: Request) {
  await clearResidentSessionCookie();
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/stanar/odjavljen`, { status: 303 });
}

export async function GET(req: Request) {
  return POST(req);
}
