"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/app/i18n-provider";

import {
  DEMO_LOGIN_ACCOUNTS,
  DEMO_LOGIN_PASSWORD,
  type DemoLoginAccount,
} from "./demo-login-accounts";

export function DemoLoginAccountsTable({
  onUse,
}: {
  onUse: (account: DemoLoginAccount) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-5">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">
        {t("auth.demoAccountsTitle")}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-foreground-muted)]">
        {t("auth.demoAccountsHint", { password: DEMO_LOGIN_PASSWORD })}
      </p>

      <div className="-mx-1 mt-3 overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left text-xs">
          <thead>
            <tr className="text-[var(--color-foreground-subtle)]">
              <th className="pb-2 pr-2 font-medium">{t("auth.demoAccountsOrg")}</th>
              <th className="pb-2 pr-2 font-medium">{t("auth.demoAccountsRole")}</th>
              <th className="pb-2 pr-2 font-medium">{t("auth.demoAccountsEmail")}</th>
              <th className="pb-2 font-medium">
                <span className="sr-only">{t("auth.demoAccountsUse")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {DEMO_LOGIN_ACCOUNTS.map((account) => (
              <tr
                key={account.email}
                className="border-t border-[var(--color-border)] align-top"
              >
                <td className="py-2 pr-2 text-[var(--color-foreground)]">
                  {account.org === "investor"
                    ? t("auth.demoAccountsInvestor")
                    : t("auth.demoAccountsAgency")}
                </td>
                <td className="py-2 pr-2 text-[var(--color-foreground)]">
                  {t(account.roleKey)}
                </td>
                <td className="py-2 pr-2 font-mono text-[11px] break-all text-[var(--color-foreground-muted)]">
                  {account.email}
                </td>
                <td className="py-1.5 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => onUse(account)}
                  >
                    {t("auth.demoAccountsUse")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
