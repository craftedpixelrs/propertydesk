"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useT } from "@/components/app/i18n-provider";

export function RegisterBuyerButton({ projectId }: { projectId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: string; message?: string } | null>(null);

  async function submit() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await apiClient.post<{
        registrationId: string;
        status: "PENDING" | "CONFLICT_REVIEW";
        message?: string;
      }>("/agency/registrations", {
        projectId,
        firstName,
        lastName,
        phone,
        email: email || undefined,
      });
      setResult({ status: res.status, message: res.message });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setError(null);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button variant="outline">{t("partners.registerBuyer.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("partners.registerBuyer.title")}</DialogTitle>
          <DialogDescription>
            {t("partners.registerBuyer.description")}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div
            className={`rounded-md border p-3 text-sm ${
              result.status === "PENDING"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-orange-300 bg-orange-50 text-orange-800"
            }`}
          >
            {result.status === "PENDING"
              ? t("partners.registerBuyer.pending")
              : result.message ?? t("partners.registerBuyer.conflict")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="firstName">
                {t("common.name")}
              </label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="lastName">
                {t("partners.lastName")}
              </label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="phone">
                {t("common.phone")}
              </label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                {t("common.email")} ({t("common.optional")})
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              />
            </div>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">
                {error}
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={loading}>
            {result ? t("common.close") : t("common.cancel")}
          </Button>
          {!result ? (
            <Button
              onClick={submit}
              loading={loading}
              disabled={!firstName || !lastName || !phone}
            >
              {t("partners.registerBuyer.submit")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
