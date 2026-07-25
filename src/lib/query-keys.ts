/**
 * TanStack Query key builder — always org-scoped.
 *
 * Every cached query must include the active organization id in its key
 * so switching orgs (or a fresh session for a different tenant) never
 * serves stale rows across tenants. Call sites do:
 *
 *   const key = qk.projects.list(orgId, { status: "PRE_SALES" });
 *   useQuery({ queryKey: key, queryFn: … });
 *
 * The shapes are stable across the codebase so `queryClient.invalidateQueries({ queryKey: qk.projects.all(orgId) })`
 * works predictably.
 */
export const qk = {
  projects: {
    all: (orgId: string) => ["projects", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["projects", orgId, "list", filters ?? {}] as const,
    detail: (orgId: string, id: string) => ["projects", orgId, "detail", id] as const,
  },
  units: {
    all: (orgId: string) => ["units", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["units", orgId, "list", filters ?? {}] as const,
    detail: (orgId: string, id: string) => ["units", orgId, "detail", id] as const,
  },
  buyers: {
    all: (orgId: string) => ["buyers", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["buyers", orgId, "list", filters ?? {}] as const,
    detail: (orgId: string, id: string) => ["buyers", orgId, "detail", id] as const,
    duplicates: (orgId: string, params: Record<string, unknown>) =>
      ["buyers", orgId, "duplicates", params] as const,
  },
  reservations: {
    all: (orgId: string) => ["reservations", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["reservations", orgId, "list", filters ?? {}] as const,
    detail: (orgId: string, id: string) => ["reservations", orgId, "detail", id] as const,
  },
  sales: {
    all: (orgId: string) => ["sales", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["sales", orgId, "list", filters ?? {}] as const,
    detail: (orgId: string, id: string) => ["sales", orgId, "detail", id] as const,
  },
  payments: {
    all: (orgId: string) => ["payments", orgId] as const,
    list: (orgId: string, filters?: Record<string, unknown>) =>
      ["payments", orgId, "list", filters ?? {}] as const,
  },
  notifications: {
    all: (userId: string) => ["notifications", userId] as const,
    list: (userId: string, filters?: Record<string, unknown>) =>
      ["notifications", userId, "list", filters ?? {}] as const,
    unread: (userId: string) => ["notifications", userId, "unread"] as const,
  },
  dashboard: {
    root: (orgId: string) => ["dashboard", orgId] as const,
  },
  reports: {
    all: (orgId: string) => ["reports", orgId] as const,
    inventory: (orgId: string, filters?: Record<string, unknown>) =>
      ["reports", orgId, "inventory", filters ?? {}] as const,
    sales: (orgId: string, filters?: Record<string, unknown>) =>
      ["reports", orgId, "sales", filters ?? {}] as const,
    payments: (orgId: string, filters?: Record<string, unknown>) =>
      ["reports", orgId, "payments", filters ?? {}] as const,
  },
} as const;
