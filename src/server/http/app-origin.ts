import "server-only";

import { serverEnv } from "@/lib/env";

/**
 * Origin of this container. `BETTER_AUTH_URL` is a runtime env value, so one
 * image can serve `my.`, `demo.`, and `staging.` without baking the host.
 */
export function appOrigin(): string {
  return serverEnv.BETTER_AUTH_URL.replace(/\/$/, "");
}
