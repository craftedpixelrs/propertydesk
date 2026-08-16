"use client";

import { useEffect, useState } from "react";
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

interface BuyerOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function AgencyReserveButton({ unitId }: { unitId: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState<BuyerOption[]>([]);
  const [buyerId, setBuyerId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingBuyers(true);
    apiClient
      .get<BuyerOption[]>("/buyers", { query: { page: 1, pageSize: 50, activeOnly: true } })
      .then((rows) => setBuyers(rows ?? []))
      .catch(() => setBuyers([]))
      .finally(() => setLoadingBuyers(false));
  }, [open]);

  async function submit() {
    if (!buyerId) return;
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/agency/reservations", {
        unitId,
        buyerId,
        notes: notes || undefined,
      });
      setOpen(false);
      setBuyerId("");
      setNotes("");
      router.push("/moje-rezervacije");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("partners.reserve.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("partners.reserve.title")}</DialogTitle>
          <DialogDescription>
            {t("partners.reserve.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="buyer">
              {t("partners.buyer")}
            </label>
            <select
              id="buyer"
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
              disabled={loadingBuyers}
            >
              <option value="">{t("partners.reserve.selectBuyer")}</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.firstName} {b.lastName} · {b.phone}
                </option>
              ))}
            </select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={loading} disabled={!buyerId}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
