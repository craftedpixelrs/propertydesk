import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  getCompanyBillingProfile,
  upsertCompanyBillingProfile,
} from "@/server/services/billing/company-profile.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const ctx = await requireSuperAdmin();
  const profile = await getCompanyBillingProfile();
  const t = createT(await resolveRequestLocale());

  async function save(formData: FormData) {
    "use server";
    const ctxSA = await requireSuperAdmin();
    const tSave = createT(await resolveRequestLocale());
    const str = (k: string) => formData.get(k)?.toString().trim() || null;
    const strReq = (k: string) => {
      const v = str(k);
      if (!v) throw new Error(tSave("admin.companyProfile.fieldRequired", { field: k }));
      return v;
    };
    await upsertCompanyBillingProfile(
      {
        legalName: strReq("legalName"),
        tradeName: str("tradeName"),
        taxNumber: strReq("taxNumber"),
        registrationNumber: str("registrationNumber"),
        vatId: str("vatId"),
        addressLine1: strReq("addressLine1"),
        addressLine2: str("addressLine2"),
        city: strReq("city"),
        postalCode: strReq("postalCode"),
        country: strReq("country"),
        email: str("email"),
        phone: str("phone"),
        website: str("website"),
        sefApiKey: str("sefApiKey"),
      },
      ctxSA.session.user.id,
    );
    revalidatePath("/administracija/naplata/profil-firme");
    redirect("/administracija/naplata/profil-firme?saved=1");
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">{t("admin.companyProfile.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.companyProfile.subtitle")}
        </p>
      </header>
      <form action={save} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.companyProfile.basics")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="legalName" label={t("admin.companyProfile.legalName")} defaultValue={profile?.legalName ?? ""} required />
            <F name="tradeName" label={t("admin.companyProfile.tradeName")} defaultValue={profile?.tradeName ?? ""} />
            <F name="taxNumber" label={t("admin.companyProfile.taxNumber")} defaultValue={profile?.taxNumber ?? ""} required />
            <F name="registrationNumber" label={t("admin.companyProfile.registrationNumber")} defaultValue={profile?.registrationNumber ?? ""} />
            <F name="vatId" label={t("admin.companyProfile.vatId")} defaultValue={profile?.vatId ?? ""} />
            <F name="country" label={t("admin.companyProfile.country")} defaultValue={profile?.country ?? "RS"} required maxLength={2} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.companyProfile.address")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="addressLine1" label={t("admin.companyProfile.street")} defaultValue={profile?.addressLine1 ?? ""} required />
            <F name="addressLine2" label={t("admin.companyProfile.address2")} defaultValue={profile?.addressLine2 ?? ""} />
            <F name="postalCode" label={t("admin.companyProfile.postalCode")} defaultValue={profile?.postalCode ?? ""} />
            <F name="city" label={t("admin.companyProfile.city")} defaultValue={profile?.city ?? ""} required />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.companyProfile.contactSef")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="email" label={t("admin.companyProfile.contactEmail")} type="email" defaultValue={profile?.email ?? ""} />
            <F name="phone" label={t("admin.companyProfile.contactPhone")} defaultValue={profile?.phone ?? ""} />
            <F name="website" label={t("admin.companyProfile.website")} defaultValue={profile?.website ?? ""} />
            <F
              name="sefApiKey"
              label={t("admin.companyProfile.sefKey")}
              type="password"
              placeholder={
                profile?.sefApiKeyMasked
                  ? t("admin.companyProfile.sefKeySet", { masked: profile.sefApiKeyMasked })
                  : t("admin.companyProfile.sefKeyUnset")
              }
              hint={t("admin.companyProfile.sefKeyHint")}
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

function F({
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
