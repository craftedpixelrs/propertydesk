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
import { formatDate } from "@/lib/formatters/date";

interface PlanOption {
  code: string;
  name: string;
}

export interface OrganizationFormValues {
  name: string;
  slug: string;
  type: "INVESTOR" | "AGENCY";
  legalName: string;
  displayName: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "CLOSED";
  trialDays?: number;
  trialEndsAt?: string | null;
  originalTrialDays?: number | null;
}

interface OrganizationFormProps {
  plans: PlanOption[];
  mode?: "create" | "edit";
  organizationId?: string;
  initialValues?: Partial<OrganizationFormValues>;
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <>
      {messages.map((m) => (
        <p key={m} className="mt-1 text-xs text-[var(--color-danger)]">
          {m}
        </p>
      ))}
    </>
  );
}

export function NewOrganizationForm({
  plans,
  mode = "create",
  organizationId,
  initialValues,
}: OrganizationFormProps) {
  const router = useRouter();
  const t = useT();
  const isEdit = mode === "edit";
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
      postalCode: String(fd.get("postalCode") ?? "").trim() || null,
      country: String(fd.get("country") ?? "").trim() || null,
      taxNumber: String(fd.get("taxNumber") ?? "").trim() || null,
      registrationNumber: String(fd.get("registrationNumber") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      phone: String(fd.get("phone") ?? "").trim() || null,
      website: String(fd.get("website") ?? "").trim() || null,
      planCode: String(fd.get("planCode") ?? plans[0]?.code ?? "trial"),
      status: String(fd.get("status") ?? "TRIAL") as OrganizationFormValues["status"],
      trialDays: (() => {
        const raw = String(fd.get("trialDays") ?? "").trim();
        if (!raw) return isEdit ? null : 30;
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
      })(),
    };

    const missing: Record<string, string[]> = {};
    for (const key of ["name", "slug", "legalName", "displayName"] as const) {
      if (!payload[key]) missing[key] = [t("validation.required")];
    }
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      setError(t("errors.validation"));
      setSubmitting(false);
      return;
    }

    try {
      if (isEdit && organizationId) {
        await apiClient.patch(`/platform/organizations/${organizationId}`, payload);
        toast.success(t("admin.newOrg.updated"));
        router.refresh();
        return;
      } else {
        await apiClient.post("/platform/organizations", payload);
        toast.success(t("admin.newOrg.created"));
      }
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
    <form
      key={
        isEdit
          ? `${organizationId}-${initialValues?.trialDays ?? ""}-${initialValues?.trialEndsAt ?? ""}-${initialValues?.status ?? ""}`
          : "create"
      }
      onSubmit={onSubmit}
      className="space-y-4"
    >
      {error ? (
        <Alert tone="danger">
          <AlertTitle>{t("admin.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{t("admin.newOrg.name")}</Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            defaultValue={initialValues?.name ?? ""}
          />
          <FieldError messages={fieldErrors.name} />
        </div>
        <div>
          <Label htmlFor="slug">{t("admin.newOrg.slug")}</Label>
          <Input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            placeholder={t("admin.newOrg.slugPlaceholder")}
            defaultValue={initialValues?.slug ?? ""}
          />
          <FieldError messages={fieldErrors.slug} />
        </div>
        <div>
          <Label htmlFor="type">{t("admin.newOrg.orgType")}</Label>
          <select
            id="type"
            name="type"
            required
            defaultValue={initialValues?.type ?? "INVESTOR"}
            className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="INVESTOR">{t("organization.types.investor")}</option>
            <option value="AGENCY">{t("organization.types.agency")}</option>
          </select>
          <FieldError messages={fieldErrors.type} />
        </div>
        <div>
          <Label htmlFor="status">{t("common.statusLabel")}</Label>
          <select
            id="status"
            name="status"
            required
            defaultValue={initialValues?.status ?? "TRIAL"}
            className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          >
            <option value="TRIAL">{t("status.trial")}</option>
            <option value="ACTIVE">{t("status.active")}</option>
            <option value="RESTRICTED">{t("status.restricted")}</option>
            <option value="SUSPENDED">{t("status.suspended")}</option>
            <option value="CLOSED">{t("status.closed")}</option>
          </select>
          <FieldError messages={fieldErrors.status} />
        </div>
        <div>
          <Label htmlFor="planCode">{t("admin.newOrg.plan")}</Label>
          <select
            id="planCode"
            name="planCode"
            required
            defaultValue={initialValues?.planCode ?? plans[0]?.code}
            className="mt-1 h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
          >
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <FieldError messages={fieldErrors.planCode} />
        </div>
        <div>
          <Label htmlFor="trialDays">{t("admin.newOrg.trialDays")}</Label>
          <Input
            id="trialDays"
            name="trialDays"
            type="number"
            min={0}
            max={365}
            defaultValue={
              isEdit
                ? (initialValues?.trialDays ?? "")
                : (initialValues?.trialDays ?? 30)
            }
          />
          {isEdit ? (
            <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
              {initialValues?.trialEndsAt
                ? new Date(initialValues.trialEndsAt).getTime() > Date.now()
                  ? t("admin.newOrg.trialDaysHintActive", {
                      date: formatDate(initialValues.trialEndsAt),
                    })
                  : t("admin.newOrg.trialDaysHintExpired", {
                      date: formatDate(initialValues.trialEndsAt),
                      days: initialValues.originalTrialDays ?? initialValues.trialDays ?? 0,
                    })
                : t("admin.newOrg.trialDaysHintNone")}
            </p>
          ) : null}
          <FieldError messages={fieldErrors.trialDays} />
        </div>
        <div>
          <Label htmlFor="displayName">{t("admin.newOrg.displayName")}</Label>
          <Input
            id="displayName"
            name="displayName"
            required
            defaultValue={initialValues?.displayName ?? ""}
          />
          <FieldError messages={fieldErrors.displayName} />
        </div>
        <div>
          <Label htmlFor="legalName">{t("admin.newOrg.legalName")}</Label>
          <Input
            id="legalName"
            name="legalName"
            required
            defaultValue={initialValues?.legalName ?? ""}
          />
          <FieldError messages={fieldErrors.legalName} />
        </div>
        <div>
          <Label htmlFor="taxNumber">{t("admin.newOrg.taxNumber")}</Label>
          <Input
            id="taxNumber"
            name="taxNumber"
            defaultValue={initialValues?.taxNumber ?? ""}
          />
          <FieldError messages={fieldErrors.taxNumber} />
        </div>
        <div>
          <Label htmlFor="registrationNumber">{t("admin.newOrg.registrationNumber")}</Label>
          <Input
            id="registrationNumber"
            name="registrationNumber"
            defaultValue={initialValues?.registrationNumber ?? ""}
          />
          <FieldError messages={fieldErrors.registrationNumber} />
        </div>
        <div>
          <Label htmlFor="address">{t("admin.newOrg.address")}</Label>
          <Input
            id="address"
            name="address"
            defaultValue={initialValues?.address ?? ""}
          />
          <FieldError messages={fieldErrors.address} />
        </div>
        <div>
          <Label htmlFor="city">{t("admin.newOrg.city")}</Label>
          <Input id="city" name="city" defaultValue={initialValues?.city ?? ""} />
          <FieldError messages={fieldErrors.city} />
        </div>
        <div>
          <Label htmlFor="postalCode">{t("admin.newOrg.postalCode")}</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={initialValues?.postalCode ?? ""}
          />
          <FieldError messages={fieldErrors.postalCode} />
        </div>
        <div>
          <Label htmlFor="country">{t("admin.newOrg.country")}</Label>
          <Input
            id="country"
            name="country"
            maxLength={2}
            defaultValue={initialValues?.country ?? "RS"}
          />
          <FieldError messages={fieldErrors.country} />
        </div>
        <div>
          <Label htmlFor="email">{t("admin.newOrg.contactEmail")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={initialValues?.email ?? ""}
          />
          <FieldError messages={fieldErrors.email} />
        </div>
        <div>
          <Label htmlFor="phone">{t("common.phone")}</Label>
          <Input id="phone" name="phone" defaultValue={initialValues?.phone ?? ""} />
          <FieldError messages={fieldErrors.phone} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="website">{t("admin.newOrg.website")}</Label>
          <Input
            id="website"
            name="website"
            placeholder="https://"
            defaultValue={initialValues?.website ?? ""}
          />
          <FieldError messages={fieldErrors.website} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={submitting}>
          {isEdit ? t("admin.newOrg.save") : t("admin.newOrg.create")}
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
