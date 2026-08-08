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

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage() {
  const ctx = await requireSuperAdmin();
  const profile = await getCompanyBillingProfile();

  async function save(formData: FormData) {
    "use server";
    const ctxSA = await requireSuperAdmin();
    const str = (k: string) => formData.get(k)?.toString().trim() || null;
    const strReq = (k: string) => {
      const v = str(k);
      if (!v) throw new Error(`${k} je obavezno.`);
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
        <h2 className="text-lg font-semibold">Profil izdavaoca</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Ovi podaci se pojavljuju na svakoj fakturi kao izdavalac. Izmena važi za nove fakture — postojeće čuvaju
          snapshot iz trenutka izdavanja.
        </p>
      </header>
      <form action={save} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Osnovni podaci</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="legalName" label="Naziv pravnog lica *" defaultValue={profile?.legalName ?? ""} required />
            <F name="tradeName" label="Skraćeni naziv" defaultValue={profile?.tradeName ?? ""} />
            <F name="taxNumber" label="PIB *" defaultValue={profile?.taxNumber ?? ""} required />
            <F name="registrationNumber" label="Matični broj" defaultValue={profile?.registrationNumber ?? ""} />
            <F name="vatId" label="PDV broj" defaultValue={profile?.vatId ?? ""} />
            <F name="country" label="Država (ISO2) *" defaultValue={profile?.country ?? "RS"} required maxLength={2} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="addressLine1" label="Ulica i broj *" defaultValue={profile?.addressLine1 ?? ""} required />
            <F name="addressLine2" label="Dodatak adrese" defaultValue={profile?.addressLine2 ?? ""} />
            <F name="postalCode" label="Poštanski broj" defaultValue={profile?.postalCode ?? ""} />
            <F name="city" label="Grad *" defaultValue={profile?.city ?? ""} required />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontakt & SEF</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <F name="email" label="Kontakt email" type="email" defaultValue={profile?.email ?? ""} />
            <F name="phone" label="Kontakt telefon" defaultValue={profile?.phone ?? ""} />
            <F name="website" label="Website" defaultValue={profile?.website ?? ""} />
            <F
              name="sefApiKey"
              label="SEF API ključ"
              type="password"
              placeholder={profile?.sefApiKeyMasked ? `Postavljen (${profile.sefApiKeyMasked})` : "Nije postavljen"}
              hint="Ostavi prazno da zadržiš postojeći ključ. Sačuvano se šifruje AES-256-GCM."
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
