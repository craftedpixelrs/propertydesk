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
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  await requireSuperAdmin();
  const t = createT(await resolveRequestLocale());
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
        <h2 className="text-lg font-semibold">{t("admin.bankAccounts.title")}</h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.bankAccounts.subtitle")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.bankAccounts.active")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[var(--color-foreground-subtle)]">
              <tr>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.bankAccounts.bank")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.bankAccounts.number")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.bankAccounts.iban")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("admin.bankAccounts.currency").replace(" *", "")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2">
                  {t("common.statusLabel")}
                </th>
                <th className="border-b border-[var(--color-border)] px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-foreground-muted)]">
                    {t("admin.bankAccounts.empty")}
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-3 py-2">{a.bankName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.accountNumber}</td>
                    <td className="px-3 py-2 font-mono text-xs">{a.iban ?? t("admin.dash")}</td>
                    <td className="px-3 py-2">{a.currency}</td>
                    <td className="px-3 py-2">
                      {a.isActive ? (
                        <Badge tone="success">
                          {t("admin.bankAccounts.activeDefault", {
                            suffix: a.isDefault ? t("admin.bankAccounts.defaultSuffix") : "",
                          })}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">{t("admin.inactive")}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.isActive ? (
                        <form action={deactivate}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            {t("admin.bankAccounts.deactivate")}
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
          <CardTitle className="text-base">{t("admin.bankAccounts.addNew")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={create} className="grid gap-3 md:grid-cols-2">
            <F name="bankName" label={t("admin.bankAccounts.bankName")} required />
            <F
              name="accountNumber"
              label={t("admin.bankAccounts.accountNumber")}
              required
              placeholder={t("admin.bankAccounts.accountPlaceholder")}
            />
            <F name="iban" label={t("admin.bankAccounts.iban")} placeholder={t("admin.bankAccounts.ibanPlaceholder")} />
            <F name="swiftBic" label={t("admin.bankAccounts.swift")} />
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-[var(--color-foreground-muted)]">
                {t("admin.bankAccounts.currency")}
              </span>
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
            <F name="holderName" label={t("admin.bankAccounts.holder")} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" className="size-4" />
              <span>{t("admin.bankAccounts.isDefault")}</span>
            </label>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">{t("common.add")}</Button>
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
