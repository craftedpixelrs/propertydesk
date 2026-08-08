import { publicEnv } from "@/lib/env";
import { ApiClient } from "@/lib/api-client/client";

/**
 * App-wide default API client (browser + Node contexts).
 *
 * In the browser we always use a same-origin base URL (`/api/v1`) so the
 * client works regardless of how the app was reached — `localhost:3000`,
 * `192.168.x.x:3000`, a LAN hostname, or a production domain. Cookies
 * flow naturally without cross-origin restrictions.
 *
 * On the server (SSR / route handlers rarely call this, but keep the
 * fallback for tests and future RN apps) we fall back to
 * `NEXT_PUBLIC_APP_URL` to construct an absolute URL that Node's fetch
 * can resolve.
 */
const browserBaseUrl = "/api/v1";
const serverBaseUrl = `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/v1`;

export const apiClient = new ApiClient({
  baseUrl: typeof window === "undefined" ? serverBaseUrl : browserBaseUrl,
});

export { ApiClient } from "@/lib/api-client/client";
export { ApiClientError } from "@/lib/api-client/errors";
