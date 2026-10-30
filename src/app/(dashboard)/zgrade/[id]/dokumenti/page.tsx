import { Card, CardContent } from "@/components/ui/card";
import { PermissionGuard } from "@/components/app/permission-guard";
import { loadUserContext, requireTenantPage } from "@/server/auth/context";
import { listDocuments } from "@/server/services/documents.service";
import { assertBuildingBelongsToOrg } from "@/server/services/manager/buildings.service";
import { formatDate } from "@/lib/formatters";
import { createT } from "@/lib/i18n";
import { DeleteDocumentButton, UploadDocumentDialog } from "@/features/manager/document-forms";

interface Props {
  params: Promise<{ id: string }>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BuildingDocumentsTab({ params }: Props) {
  const { id } = await params;
  const ctx = await loadUserContext();
  requireTenantPage(ctx, { permission: "building.read", orgType: "MANAGER" });
  const t = createT(ctx.user.locale);
  await assertBuildingBelongsToOrg(ctx.activeOrganization.id, id);

  const docs = await listDocuments({
    organizationId: ctx.activeOrganization.id,
    entityType: "ManagedBuilding",
    entityId: id,
    page: 1,
    pageSize: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <PermissionGuard permission="document.manage">
          <UploadDocumentDialog
            entityType="ManagedBuilding"
            entityId={id}
            categories={["BUILDING", "INVOICE", "DUES", "ASSEMBLY", "OTHER"]}
            defaultCategory="BUILDING"
          />
        </PermissionGuard>
      </div>

      {docs.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-foreground-muted)]">
            {t("manager.documents.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-inset)] text-left text-xs tracking-wide text-[var(--color-foreground-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">{t("manager.documents.columns.name")}</th>
                <th className="px-4 py-3">{t("manager.documents.columns.category")}</th>
                <th className="px-4 py-3 text-right">{t("manager.documents.columns.size")}</th>
                <th className="px-4 py-3">{t("manager.documents.columns.uploadedAt")}</th>
                <th className="px-4 py-3">{t("manager.documents.columns.uploader")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {docs.items.map((d) => (
                <tr key={d.id} className="hover:bg-[var(--color-surface-inset)]">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`/api/v1/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-brand-700)] hover:underline"
                    >
                      {d.fileName}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {t(
                      `manager.documents.category.${d.category as "BUILDING" | "TICKET" | "ASSEMBLY" | "DUES" | "OTHER" | "INVOICE"}` as const,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums">
                    {formatSize(d.size)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-foreground-muted)]">
                    {d.uploadedByUser?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PermissionGuard permission="document.manage">
                      <DeleteDocumentButton documentId={d.id} />
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
