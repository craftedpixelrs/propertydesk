import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

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
  // Same-origin so one Docker image works on my. / demo. / staging.
  // Better Auth falls back to `window.location.origin` when unset.
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
