"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { toast } from "sonner";
import { useT } from "@/components/app/i18n-provider";

interface PlanOption {
  code: string;
  name: string;
}

export function NewOrganizationForm({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(evt: React.FormEvent<HTMLFormElement>) {
    evt.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const fd = new FormData(evt.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      slug: String(fd.get("slug") ?? "").trim(),
      type: String(fd.get("type") ?? "INVESTOR") as "INVESTOR" | "AGENCY",
      legalName: String(fd.get("legalName") ?? "").trim(),
      displayName: String(fd.get("displayName") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim() || null,
      address: String(fd.get("address") ?? "").trim() || null,
      taxNumber: String(fd.get("taxNumber") ?? "").trim() || null,
      registrationNumber:
        String(fd.get("registrationNumber") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
      planCode: String(fd.get("planCode") ?? plans[0]?.code ?? "trial"),
      trialDays: Number.parseInt(String(fd.get("trialDays") ?? "30"), 10) || 30,
    };

    try {
      await apiClient.post("/platform/organizations", payload);
      toast.success(t("admin.newOrg.created"));
      router.push("/administracija/organizacije");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError(t("common.unexpectedError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <Alert tone="danger">
          <AlertTitle>{t("admin.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{t("admin.newOrg.name")}</Label>
          <Input id="name" name="name" required minLength={2} />
          {fieldErrors.name?.map((m) => (
            <p key={m} className="mt-1 text-xs text-[var(--color-danger)]">
              {m}
            </p>
          ))}
        </div>
        <div>
          <Label htmlFor="slug">{t("admin.newOrg.slug")}</Label>
          <Input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            placeholder={t("admin.newOrg.slugPlaceholder")}
          />
          {fieldErrors.slug?.map((m) => (
            <p key={m} className="mt-1 text-xs text-[var(--color-danger)]">
              {m}
            </p>
          ))}
        </div>
        <div>
          <Label htmlFor="type">{t("admin.newOrg.orgType")}</Label>
          <select
            id="type"
            name="type"
            required
            className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="INVESTOR">{t("organization.types.investor")}</option>
            <option value="AGENCY">{t("organization.types.agency")}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="planCode">{t("admin.newOrg.plan")}</Label>
          <select
            id="planCode"
            name="planCode"
            required
            className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          >
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="displayName">{t("admin.newOrg.displayName")}</Label>
          <Input id="displayName" name="displayName" required />
        </div>
        <div>
          <Label htmlFor="legalName">{t("admin.newOrg.legalName")}</Label>
          <Input id="legalName" name="legalName" required />
        </div>
        <div>
          <Label htmlFor="taxNumber">{t("admin.newOrg.taxNumber")}</Label>
          <Input id="taxNumber" name="taxNumber" />
        </div>
        <div>
          <Label htmlFor="registrationNumber">{t("admin.newOrg.registrationNumber")}</Label>
          <Input id="registrationNumber" name="registrationNumber" />
        </div>
        <div>
          <Label htmlFor="address">{t("admin.newOrg.address")}</Label>
          <Input id="address" name="address" />
        </div>
        <div>
          <Label htmlFor="city">{t("admin.newOrg.city")}</Label>
          <Input id="city" name="city" />
        </div>
        <div>
          <Label htmlFor="email">{t("admin.newOrg.contactEmail")}</Label>
          <Input id="email" name="email" type="email" />
        </div>
        <div>
          <Label htmlFor="phone">{t("common.phone")}</Label>
          <Input id="phone" name="phone" />
        </div>
        <div>
          <Label htmlFor="trialDays">{t("admin.newOrg.trialDays")}</Label>
          <Input
            id="trialDays"
            name="trialDays"
            type="number"
            min={0}
            max={365}
            defaultValue={30}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>
          {t("admin.newOrg.create")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/administracija/organizacije")}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
