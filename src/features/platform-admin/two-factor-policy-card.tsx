"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useT } from "@/components/app/i18n-provider";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function TwoFactorPolicyCard({
  required,
  callerEnabled,
}: {
  required: boolean;
  callerEnabled: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function save(next: boolean) {
    setBusy(true);
    try {
      await apiClient.patch("/platform/security", { twoFactorRequired: next });
      toast.success(t("admin.twoFactorPolicy.saved"));
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t("errors.generic");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("admin.twoFactorPolicy.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {t("admin.twoFactorPolicy.hint")}
        </p>
        <p className="text-sm font-medium">
          {required ? t("admin.twoFactorPolicy.on") : t("admin.twoFactorPolicy.off")}
        </p>
        {callerEnabled ? (
          <Button
            type="button"
            variant={required ? "outline" : "primary"}
            loading={busy}
            onClick={() => void save(!required)}
          >
            {required ? t("admin.twoFactorPolicy.disable") : t("admin.twoFactorPolicy.enable")}
          </Button>
        ) : (
          <p className="text-sm">
            {t("admin.twoFactorPolicy.needOwn")}{" "}
            <Link
              href="/podesavanja/profil"
              className="font-medium text-[var(--color-brand-700)] hover:underline"
            >
              {t("nav.account")}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
