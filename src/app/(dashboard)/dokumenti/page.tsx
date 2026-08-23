import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { prisma } from "@/server/db/prisma";
import { formatDate } from "@/lib/formatters";
import { DocumentUploader } from "@/features/documents/document-uploader";
import { createT, type TranslationKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DokumentiPage() {
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "document.read" });
  const t = createT(ctx.user.locale);

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

  function categoryLabel(category: string) {
    const key = `ops.documents.categories.${category}` as TranslationKey;
    const out = t(key);
    return out === key ? category : out;
  }

  function visibilityLabel(visibility: string) {
    const key = `ops.documents.visibilities.${visibility}` as TranslationKey;
    const out = t(key);
    return out === key ? visibility : out;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.documents")}</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("ops.documents.subtitle")}
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ops.documents.uploadTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUploader />
          </CardContent>
        </Card>
      ) : null}

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("ops.documents.empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
                  <tr>
                    <th className="py-2 pr-3">{t("ops.documents.name")}</th>
                    <th className="py-2 pr-3">{t("ops.documents.category")}</th>
                    <th className="py-2 pr-3">{t("ops.documents.visibility")}</th>
                    <th className="py-2 pr-3">{t("ops.documents.uploadedBy")}</th>
                    <th className="py-2 pr-3">{t("common.date")}</th>
                    <th className="py-2 pr-3 text-right">{t("common.download")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {docs.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-3 font-medium">{d.originalFileName}</td>
                      <td className="py-2 pr-3">{categoryLabel(d.category)}</td>
                      <td className="py-2 pr-3 text-xs">
                        {visibilityLabel(d.visibility)}
                      </td>
                      <td className="py-2 pr-3">{d.uploadedByUser.name ?? "—"}</td>
                      <td className="py-2 pr-3">{formatDate(d.createdAt)}</td>
                      <td className="py-2 pr-3 text-right">
                        <Link
                          className="text-[var(--color-brand-700)] hover:underline"
                          href={`/api/v1/documents/${d.id}/download`}
                          target="_blank"
                        >
                          {t("common.download")}
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
