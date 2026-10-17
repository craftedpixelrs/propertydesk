"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useT } from "@/components/app/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FormActions } from "@/components/forms/form-actions";
import { apiClient, ApiClientError } from "@/lib/api-client";

export function InviteAgencyForm() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [defaultProtectionDays, setDefaultProtectionDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setAgencyName("");
    setDefaultProtectionDays("30");
    setNotes("");
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/agencies", {
        email,
        agencyName: agencyName.trim() || undefined,
        defaultProtectionDays: Number(defaultProtectionDays) || 30,
        notes: notes || undefined,
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>
        <Button>{t("partners.inviteForm.trigger")}</Button>
      </DrawerTrigger>
      <DrawerContent side="right">
        <DrawerHeader className="flex shrink-0 flex-row items-start justify-between gap-3 border-b border-[var(--color-border)] p-4 pr-3">
          <div className="min-w-0 space-y-1">
            <DrawerTitle>{t("partners.inviteForm.title")}</DrawerTitle>
            <DrawerDescription>{t("partners.inviteForm.description")}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("common.close")}>
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {open ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="agencyEmail">
                  {t("partners.inviteForm.email")}
                </label>
                <input
                  id="agencyEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="agencyName">
                  {t("partners.inviteForm.agencyName")}
                </label>
                <input
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder={t("partners.inviteForm.agencyNamePlaceholder")}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="defaultProtectionDays">
                  {t("partners.inviteForm.protectionDays")}
                </label>
                <input
                  id="defaultProtectionDays"
                  type="number"
                  min={0}
                  max={365}
                  value={defaultProtectionDays}
                  onChange={(e) => setDefaultProtectionDays(e.target.value)}
                  className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="notes">
                  {t("partners.note")} ({t("common.optional")})
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-20 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
              </div>
              {error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              <FormActions sticky>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={loading}>
                  {t("partners.invite")}
                </Button>
              </FormActions>
            </form>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
