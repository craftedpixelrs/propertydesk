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

export const dynamic = "force-dynamic";

export default async function BillingGlobalSettingsPage() {
  const ctx = await requireSuperAdmin();
  const s = await getOrCreateGlobalBillingSettings();

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
        <h2 className="text-lg font-semibold">Globalna podešavanja naplate</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Ova podešavanja važe za sve organizacije, sem ako pojedinačna organizacija ima
          override. Master prekidač "Naplata aktivna" onemogućava sve automatske poslove.
        </p>
      </header>
      <form action={save} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prekidači automatizacije</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {(
              [
                ["billingEnabled", "Naplata aktivna (master)"],
                ["autoGenerateInvoicesEnabled", "Automatsko kreiranje faktura"],
                ["autoSendInvoicesEnabled", "Automatsko slanje faktura"],
                ["autoRemindersEnabled", "Automatski podsetnici"],
                ["autoOverdueEnabled", "Automatski prelazak u PAST_DUE"],
                ["autoExtendSubscriptions", "Automatsko produženje pretplate"],
                ["autoRestrictAccessEnabled", "Restrikcija pristupa nakon roka"],
                ["autoSuspendEnabled", "Automatska suspenzija"],
                ["requireManualConfirmation", "Zahtevaj ručnu potvrdu"],
                [
                  "defaultInvoiceInRsd",
                  "Fakturiši u dinarskoj protivvrednosti (podrazumevano)",
                ],
              ] as const
            ).map(([key, label]) => (
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
                <span>{label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podrazumevane vrednosti</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label="Osnovna valuta" name="defaultCurrency" defaultValue={s.defaultCurrency} />
            <Field label="Trajanje probnog perioda (dana)" name="defaultTrialDays" type="number" defaultValue={String(s.defaultTrialDays)} />
            <Field label="Grace period (dana)" name="defaultGracePeriodDays" type="number" defaultValue={String(s.defaultGracePeriodDays)} />
            <Field label="Rok za plaćanje (dana)" name="defaultDueInDays" type="number" defaultValue={String(s.defaultDueInDays)} />
            <Field label="Restrikcija nakon (dana kašnjenja)" name="restrictedAfterDays" type="number" defaultValue={String(s.restrictedAfterDays)} />
            <Field label="Suspenzija nakon (dana kašnjenja)" name="suspendedAfterDays" type="number" defaultValue={String(s.suspendedAfterDays)} />
            <Field
              label="Format broja fakture"
              name="invoiceNumberFormat"
              defaultValue={s.invoiceNumberFormat}
              hint="Placeholderi: {YYYY}, {YY}, {MM}, {SEQ:N}."
            />
            <Field
              label="Napomena u podnožju fakture"
              name="invoiceFooterNote"
              defaultValue={s.invoiceFooterNote ?? ""}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">Sačuvaj</Button>
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
