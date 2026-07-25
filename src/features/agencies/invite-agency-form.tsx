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

export function InviteAgencyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agencyOrganizationId, setAgencyOrganizationId] = useState("");
  const [defaultProtectionDays, setDefaultProtectionDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/agencies", {
        agencyOrganizationId,
        defaultProtectionDays: Number(defaultProtectionDays) || 30,
        notes: notes || undefined,
      });
      setOpen(false);
      setAgencyOrganizationId("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Došlo je do greške.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Pozovi agenciju</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pozivanje agencije</DialogTitle>
          <DialogDescription>
            Unesite ID organizacije agencije. Agencija dobija poziv na svom portalu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="agencyOrganizationId">
              ID organizacije agencije
            </label>
            <input
              id="agencyOrganizationId"
              value={agencyOrganizationId}
              onChange={(e) => setAgencyOrganizationId(e.target.value)}
              required
              className="h-11 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="defaultProtectionDays">
              Podrazumevana zaštita kupca (dana)
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
              Napomena (opciono)
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
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Otkaži
            </Button>
            <Button type="submit" loading={loading}>
              Pozovi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
