import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/permissions/require";
import {
  listBankAccounts,
  createBankAccount,
  deactivateBankAccount,
} from "@/server/services/billing/bank-accounts.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  await requireSuperAdmin();
  const accounts = await listBankAccounts(false);

  async function create(formData: FormData) {
    "use server";
    const ctx = await requireSuperAdmin();
    await createBankAccount(
      {
        bankName: (formData.get("bankName") as string).trim(),
        accountNumber: (formData.get("accountNumber") as string).trim(),
        iban: (formData.get("iban") as string)?.trim() || null,
        swiftBic: (formData.get("swiftBic") as string)?.trim() || null,
        currency: ((formData.get("currency") as string) || "RSD").toUpperCase(),
        holderName: (formData.get("holderName") as string)?.trim() || null,
        isDefault: formData.get("isDefault") === "on",
      },
      ctx.session.user.id,
    );
    revalidatePath("/administracija/naplata/racuni");
  }

  async function deactivate(formData: FormData) {
    "use server";
    const ctx = await requireSuperAdmin();
    const id = formData.get("id") as string;
    await deactivateBankAccount(id, ctx.session.user.id);
    revalidatePath("/administracija/naplata/racuni");
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Poslovni računi</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          Postavite podrazumevani račun za svaku valutu. Ovi računi se koriste za generisanje
          IPS QR koda i pojavljuju se u zaglavlju fakture.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivni računi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Banka</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Broj</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">IBAN</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Valuta</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">Status</th>
                <th className="border-b border-[var(--color-border)] px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    Nema računa. Dodajte prvi ispod.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2">{a.bankName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.accountNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.iban ?? "—"}</td>
                    <td className="px-3 py-2">{a.currency}</td>
                    <td className="px-3 py-2">
                      {a.isActive ? (
                        <Badge tone="success">Aktivan{a.isDefault ? " · podrazumevan" : ""}</Badge>
                      ) : (
                        <Badge tone="neutral">Neaktivan</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.isActive ? (
                        <form action={deactivate}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Deaktiviraj
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dodaj novi račun</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={create} className="grid gap-3 md:grid-cols-2">
            <F name="bankName" label="Naziv banke *" required />
            <F name="accountNumber" label="Broj računa *" required placeholder="npr. 265-000000-00" />
            <F name="iban" label="IBAN" placeholder="RS35..." />
            <F name="swiftBic" label="SWIFT / BIC" />
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">Valuta *</span>
              <select
                name="currency"
                required
                defaultValue="RSD"
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                <option value="RSD">RSD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <F name="holderName" label="Naziv vlasnika računa" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" className="size-4" />
              <span>Podrazumevan za valutu</span>
            </label>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Dodaj</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function F(props: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, ...rest } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs text-[var(--color-foreground-muted)]">{label}</span>
      <Input {...rest} />
    </label>
  );
}
