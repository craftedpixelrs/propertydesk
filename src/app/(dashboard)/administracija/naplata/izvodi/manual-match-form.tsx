"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ManualMatchForm({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState("");

  async function match() {
    if (!invoice.trim()) {
      alert("Unesite ID / broj fakture.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/billing/bank-statement/${transactionId}/match`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ invoiceRef: invoice.trim() }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Greška: ${j?.error?.message ?? res.statusText}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function ignore() {
    const reason = prompt("Razlog za ignorisanje?");
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/v1/billing/bank-statement/${transactionId}/ignore`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Greška: ${j?.error?.message ?? res.statusText}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        placeholder="ID / broj fakture"
        value={invoice}
        onChange={(e) => setInvoice(e.target.value)}
        className="h-8 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
      />
      <Button size="sm" onClick={match} disabled={busy}>
        Upari
      </Button>
      <Button size="sm" variant="secondary" onClick={ignore} disabled={busy}>
        Ignoriši
      </Button>
    </div>
  );
}
