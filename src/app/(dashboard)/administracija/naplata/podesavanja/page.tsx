import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  getOrCreateGlobalBillingSettings,
  updateGlobalBillingSettings,
} from "@/server/services/billing/settings/global.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createT, type TranslationKey } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

const TOGGLES = [
  ["billingEnabled", "billing.toggles.billingEnabled"],
  ["autoGenerateInvoicesEnabled", "billing.toggles.autoGenerateInvoicesEnabled"],
  ["autoSendInvoicesEnabled", "billing.toggles.autoSendInvoicesEnabled"],
  ["autoRemindersEnabled", "billing.toggles.autoRemindersEnabled"],
  ["autoOverdueEnabled", "billing.toggles.autoOverdueEnabled"],
  ["autoExtendSubscriptions", "billing.toggles.autoExtendSubscriptions"],
  ["autoRestrictAccessEnabled", "billing.toggles.autoRestrictAccessEnabled"],
  ["autoSuspendEnabled", "billing.toggles.autoSuspendEnabled"],
  ["requireManualConfirmation", "billing.toggles.requireManualConfirmation"],
  ["defaultInvoiceInRsd", "admin.settingsPage.invoiceInRsd"],
] as const satisfies ReadonlyArray<readonly [string, TranslationKey]>;

export default async function BillingGlobalSettingsPage() {
  const ctx = await requireSuperAdmin();
  const s = await getOrCreateGlobalBillingSettings();
  const t = createT(await resolveRequestLocale());

  async function save(formData: FormData) {
    "use server";
    const ctxSA = await requireSuperAdmin();
    const bool = (k: string) => formData.get(k) === "on";
    const num = (k: string) => {
      const raw = formData.get(k);
      return raw == null ? undefined : Number(raw);
    };
    const str = (k: string) => (formData.get(k)?.toString() || undefined);
    await updateGlobalBillingSettings(
      {
        billingEnabled: bool("billingEnabled"),
        autoGenerateInvoicesEnabled: bool("autoGenerateInvoicesEnabled"),
        autoSendInvoicesEnabled: bool("autoSendInvoicesEnabled"),
        autoRemindersEnabled: bool("autoRemindersEnabled"),
        autoOverdueEnabled: bool("autoOverdueEnabled"),
        autoExtendSubscriptions: bool("autoExtendSubscriptions"),
        autoRestrictAccessEnabled: bool("autoRestrictAccessEnabled"),
        autoSuspendEnabled: bool("autoSuspendEnabled"),
        requireManualConfirmation: bool("requireManualConfirmation"),
        defaultCurrency: str("defaultCurrency"),
        defaultInvoiceInRsd: bool("defaultInvoiceInRsd"),
        defaultTrialDays: num("defaultTrialDays"),
        defaultGracePeriodDays: num("defaultGracePeriodDays"),
        defaultDueInDays: num("defaultDueInDays"),
        restrictedAfterDays: num("restrictedAfterDays"),
        suspendedAfterDays: num("suspendedAfterDays"),
        invoiceNumberFormat: str("invoiceNumberFormat"),
        invoiceFooterNote: str("invoiceFooterNote"),
      },
      ctxSA.session.user.id,
    );
    revalidatePath("/administracija/naplata/podesavanja");
    redirect("/administracija/naplata/podesavanja?saved=1");
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t("admin.settingsPage.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.settingsPage.subtitle")}
        </p>
      </header>
      <form action={save} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.settingsPage.togglesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {TOGGLES.map(([key, labelKey]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={Boolean((s as unknown as Record<string, unknown>)[key])}
                  className="size-4"
                />
                <span>{t(labelKey)}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.settingsPage.defaultsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label={t("admin.settingsPage.defaultCurrency")} name="defaultCurrency" defaultValue={s.defaultCurrency} />
            <Field label={t("admin.settingsPage.trialDays")} name="defaultTrialDays" type="number" defaultValue={String(s.defaultTrialDays)} />
            <Field label={t("admin.settingsPage.graceDays")} name="defaultGracePeriodDays" type="number" defaultValue={String(s.defaultGracePeriodDays)} />
            <Field label={t("admin.settingsPage.dueDays")} name="defaultDueInDays" type="number" defaultValue={String(s.defaultDueInDays)} />
            <Field label={t("admin.settingsPage.restrictAfter")} name="restrictedAfterDays" type="number" defaultValue={String(s.restrictedAfterDays)} />
            <Field label={t("admin.settingsPage.suspendAfter")} name="suspendedAfterDays" type="number" defaultValue={String(s.suspendedAfterDays)} />
            <Field
              label={t("admin.settingsPage.invoiceFormat")}
              name="invoiceNumberFormat"
              defaultValue={s.invoiceNumberFormat}
              hint={t("admin.settingsPage.invoiceFormatHint")}
            />
            <Field
              label={t("admin.settingsPage.footerNote")}
              name="invoiceFooterNote"
              defaultValue={s.invoiceFooterNote ?? ""}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">{t("common.save")}</Button>
        </div>
        <input type="hidden" name="_actor" value={ctx.session.user.id} />
      </form>
    </section>
  );
}

function Field({
  label,
  hint,
  ...rest
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs text-[var(--color-foreground-muted)]">{label}</span>
      <Input {...rest} />
      {hint ? <span className="text-xs text-[var(--color-foreground-subtle)]">{hint}</span> : null}
    </label>
  );
}
