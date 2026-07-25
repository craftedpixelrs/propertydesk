import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAllUsers } from "@/server/services/platform.service";
import { formatDate } from "@/lib/formatters/date";
import { getSession } from "@/server/auth/session";
import { ImpersonateButton } from "@/features/platform-admin/impersonate-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    q?: string;
    organizationId?: string;
  }>;
}

/**
 * SUPER_ADMIN-only view of every user in the platform, with an "Uloguj se
 * kao" affordance for each account. The layout guards SUPER_ADMIN already;
 * we also short-circuit to `/dashboard` if somehow the session is missing.
 */
export default async function PlatformUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10) || 1;
  const pageSize = 25;

  const session = await getSession();
  const currentUserId = session?.user.id ?? null;

  const { items, total } = await listAllUsers({
    page,
    pageSize,
    search: params.q,
    organizationId: params.organizationId,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Korisnici ({total})</h2>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Iz ove liste možete da se ulogujete kao bilo koji korisnik radi dijagnostike i podrške.
            Svaka impersonacija se upisuje u revizijski zapis.
          </p>
        </div>
      </div>

      <form className="grid gap-3 sm:grid-cols-3" action="/administracija/korisnici">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Pretraga po imenu ili e-mail-u…"
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm sm:col-span-2"
        />
        <Button type="submit" variant="secondary" size="sm">
          Primeni
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-foreground-muted)]">
              Nema korisnika koji odgovaraju filterima.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
                  <tr>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Korisnik</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Uloge / Organizacije</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Status</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2">Registrovan</th>
                    <th className="border-b border-[var(--color-border)] px-4 py-2 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => {
                    const isSelf = currentUserId === u.id;
                    const isSuperAdmin = u.role === "SUPER_ADMIN";
                    const disabled = isSelf || isSuperAdmin || u.banned;
                    const disabledReason = isSelf
                      ? "Ne možete se ulogovati kao Vi sami."
                      : isSuperAdmin
                        ? "Impersonacija drugih administratora platforme nije dozvoljena."
                        : u.banned
                          ? "Korisnik je banovan."
                          : undefined;

                    return (
                      <tr
                        key={u.id}
                        className="border-b border-[var(--color-border)] last:border-b-0"
                      >
                        <td className="px-4 py-2 align-top">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-[var(--color-foreground-muted)]">
                            {u.email}
                          </div>
                          {u.role ? (
                            <div className="mt-1">
                              <Badge tone="brand">{u.role}</Badge>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {u.memberships.length === 0 ? (
                            <span className="text-xs text-[var(--color-foreground-muted)]">
                              — bez organizacije —
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {u.memberships.map((m) => (
                                <li
                                  key={`${u.id}-${m.organizationId}`}
                                  className="text-xs"
                                >
                                  <span className="font-medium">
                                    {m.organizationName}
                                  </span>
                                  {" · "}
                                  <span className="font-mono text-[var(--color-foreground-muted)]">
                                    {m.role}
                                  </span>
                                  {m.organizationType ? (
                                    <span className="text-[var(--color-foreground-subtle)]">
                                      {" ("}
                                      {m.organizationType === "INVESTOR"
                                        ? "investitor"
                                        : "agencija"}
                                      {")"}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {u.banned ? (
                            <Badge tone="danger">Banovan</Badge>
                          ) : u.emailVerified ? (
                            <Badge tone="success">Verifikovan</Badge>
                          ) : (
                            <Badge tone="warning">Neverifikovan</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs align-top">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <ImpersonateButton
                            userId={u.id}
                            userName={u.name}
                            disabled={disabled}
                            disabledReason={disabledReason}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-foreground-muted)]">
            Strana {page} od {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/administracija/korisnici",
                    query: {
                      page: String(page - 1),
                      ...(params.q ? { q: params.q } : {}),
                    },
                  }}
                >
                  Prethodna
                </Link>
              </Button>
            ) : null}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={{
                    pathname: "/administracija/korisnici",
                    query: {
                      page: String(page + 1),
                      ...(params.q ? { q: params.q } : {}),
                    },
                  }}
                >
                  Sledeća
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
