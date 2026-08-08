import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireSuperAdmin } from "@/server/permissions/require";
import { updateBillingEmailTemplate } from "@/server/services/billing/emails/templates";
import { prisma } from "@/server/db/prisma";
import { TemplateEditor } from "@/features/billing/template-editor";

export const dynamic = "force-dynamic";

export default async function EditBillingTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const ctx = await requireSuperAdmin();
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);
  const template = await prisma.billingEmailTemplate.findUnique({
    where: { key },
  });
  if (!template) notFound();

  const variables = Array.isArray(template.variables)
    ? (template.variables as unknown[]).filter(
        (v): v is string => typeof v === "string",
      )
    : [];

  async function save(formData: FormData) {
    "use server";
    const inner = await requireSuperAdmin();
    const { key: rk } = await params;
    const k = decodeURIComponent(rk);
    await updateBillingEmailTemplate(
      k,
      {
        subject: (formData.get("subject") as string | null) ?? undefined,
        bodyText: (formData.get("bodyText") as string | null) ?? undefined,
        bodyHtml: (formData.get("bodyHtml") as string | null) ?? undefined,
        active: formData.get("active") === "on",
      },
      inner.session.user.id,
    );
    revalidatePath(`/administracija/naplata/sabloni/${encodeURIComponent(k)}`);
    redirect(
      `/administracija/naplata/sabloni/${encodeURIComponent(k)}?saved=1`,
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{template.name}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          <span className="font-mono text-xs">{template.key}</span>
          {template.description ? " · " + template.description : ""}
        </p>
      </header>

      <TemplateEditor
        templateKey={template.key}
        templateName={template.name}
        description={template.description}
        initialSubject={template.subject}
        initialBodyText={template.bodyText}
        initialBodyHtml={template.bodyHtml}
        initialActive={template.active}
        variables={variables}
        initialUserEmail={ctx.session.user.email ?? null}
        saveAction={save}
      />
    </section>
  );
}
