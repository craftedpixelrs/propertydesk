import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

import { publicEnv } from "@/lib/env";
import { ac } from "@/server/permissions/access-control";
import { organizationRoles, platformRoles } from "@/server/permissions/roles";

/**
 * Client-side auth handle. Safe to import from client components.
 *
 * The `ac`/`roles` re-imports are pure data (statements + role definitions)
 * and contain no server-only code, so they can safely be bundled to the
 * client.
 */
export const authClient = createAuthClient({
  baseURL: publicEnv.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient({
      ac,
      roles: organizationRoles,
    }),
    adminClient({
      ac,
      roles: platformRoles,
    }),
  ],
});

export const {
  useSession,
  useListOrganizations,
  useActiveOrganization,
  signIn,
  signOut,
  signUp,
  requestPasswordReset,
  resetPassword,
} = authClient;
