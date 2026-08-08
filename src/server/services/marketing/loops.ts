import "server-only";

import { serverEnv } from "@/lib/env";
import { DomainError } from "@/lib/errors";

/**
 * Loops.so server-to-server integration.
 *
 * We use the transactional Contacts API (`https://app.loops.so/api/v1/`)
 * rather than the public newsletter-form embed for two reasons:
 *
 *   1. We can send arbitrary custom properties (phone, company, audience,
 *      project count, city, UTM parameters, ...) alongside the standard
 *      email / firstName / lastName fields, without pre-configuring form
 *      fields in the Loops dashboard.
 *   2. The API key never touches the browser — the marketing lead route
 *      is the only caller and it lives on the server.
 *
 * Loops `PUT /contacts/update` is an upsert keyed by email — it creates
 * the contact if missing and merges properties otherwise. This is what
 * we want: if a visitor submits the form twice we don't fail, we just
 * refresh their record with the latest data.
 */

const LOOPS_API_BASE = "https://app.loops.so/api/v1";

/**
 * Loops user groups used to segment the lead pool by audience. The
 * strings must match the "userGroup" filters in the Loops dashboard for
 * automations (welcome email, sales followup) to route correctly.
 */
export const LOOPS_USER_GROUPS = {
  INVESTOR: "Investors",
  AGENCY: "Agencies",
} as const;

export type LoopsUserGroup = (typeof LOOPS_USER_GROUPS)[keyof typeof LOOPS_USER_GROUPS];

export interface LoopsContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  subscribed?: boolean;
  userGroup?: string;
  source?: string;
  mailingLists?: Record<string, boolean>;
  /**
   * Any additional key becomes a custom property on the Loops contact.
   * Undefined / null values are stripped before the request.
   */
  [customProperty: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | Record<string, boolean>;
}

/**
 * Upsert a Loops contact by email. Returns the Loops contact id when
 * available. Throws `DomainError("INTERNAL")` on transport / auth
 * errors so the caller can surface a generic 500 without leaking the
 * upstream response body.
 */
export async function upsertLoopsContact(
  payload: LoopsContactPayload,
): Promise<{ id?: string; success: boolean }> {
  const apiKey = serverEnv.LOOPS_API_KEY?.trim();
  if (!apiKey) {
    throw new DomainError(
      "INTERNAL",
      "Loops integracija nije konfigurisana (LOOPS_API_KEY nedostaje).",
    );
  }

  // Strip undefined / null values so we don't overwrite existing
  // properties on repeat submissions with blanks.
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim().length === 0) continue;
    body[key] = value;
  }

  // Attach mailing list membership when a list id is configured.
  const listId = serverEnv.LOOPS_MAILING_LIST_ID?.trim();
  if (listId && !body.mailingLists) {
    body.mailingLists = { [listId]: true };
  }

  let res: Response;
  try {
    res = await fetch(`${LOOPS_API_BASE}/contacts/update`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      // Loops occasionally takes a few seconds under load — cap our
      // patience at 10s so the user isn't left hanging.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new DomainError(
      "INTERNAL",
      "Trenutno ne možemo da primimo prijavu. Pokušajte ponovo za koji trenutak.",
      { context: { upstream: "loops", stage: "network", detail: message } },
    );
  }

  const rawText = await res.text().catch(() => "");
  let parsed: unknown = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Non-JSON body — leave `parsed` null and fall through to the
      // status-based branches below.
    }
  }

  if (!res.ok) {
    // Log the raw upstream response to the server console; the user-
    // facing message stays generic to avoid leaking internals.
    console.error(
      `[loops] contact upsert failed (${res.status}) — body:`,
      rawText,
    );
    throw new DomainError(
      "INTERNAL",
      "Trenutno ne možemo da primimo prijavu. Pokušajte ponovo za koji trenutak.",
      { context: { upstream: "loops", status: res.status } },
    );
  }

  const data = (parsed ?? {}) as { id?: string; success?: boolean };
  return { id: data.id, success: data.success !== false };
}
