import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import { DocumentUploader } from "@/features/documents/document-uploader";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  PROJECT: "Projekat",
  UNIT: "Jedinica",
  BUYER: "Kupac",
  RESERVATION: "Rezervacija",
  SALE: "Prodaja",
  PAYMENT: "Uplata",
  AGENCY: "Agencija",
  COMMISSION: "Provizija",
  OTHER: "Ostalo",
};

const VISIBILITY_LABEL: Record<string, string> = {
  INTERNAL: "Interno",
  INVESTOR_TEAM: "Investitor",
  AGENCY_SHARED: "Deljeno sa agencijom",
  BUYER_SHARED: "Deljeno sa kupcem",
};

export default async function DokumentiPage() {
  const ctx = await loadUserContext();
  if (!ctx) redirect("/sign-in");
  if (!ctx.activeOrganization) redirect("/podesavanja");

  const docs = await prisma.document.findMany({
    where: {
      organizationId: ctx.activeOrganization.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { uploadedByUser: { select: { name: true } } },
  });

  const canManage = ctx.permissions.includes("document.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dokumenti</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Poslednja dokumenta koja je Vaša organizacija otpremila.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Otpremi dokument</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader />
          </CardContent>
        </Card>
      ) : null}

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            Nema otpremljenih dokumenata.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-2 pr-3">Naziv</th>
                    <th className="py-2 pr-3">Kategorija</th>
                    <th className="py-2 pr-3">Vidljivost</th>
                    <th className="py-2 pr-3">Postavio</th>
                    <th className="py-2 pr-3">Datum</th>
                    <th className="py-2 pr-3 text-right">Preuzimanje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-3 font-medium">{d.originalFileName}</td>
                      <td className="py-2 pr-3">{CATEGORY_LABEL[d.category] ?? d.category}</td>
                      <td className="py-2 pr-3 text-xs">
                        {VISIBILITY_LABEL[d.visibility] ?? d.visibility}
                      </td>
                      <td className="py-2 pr-3">{d.uploadedByUser.name ?? "—"}</td>
                      <td className="py-2 pr-3">{formatDate(d.createdAt)}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link
                          className="text-[var(--color-brand-700)] hover:underline"
                          href={`/api/v1/documents/${d.id}/download`}
                          target="_blank"
                        >
                          Preuzmi
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
