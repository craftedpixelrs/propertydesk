"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Faza 8.1 (A2) — public reservation form on `/p/[token]`.
 *
 * Two-step UI:
 *   1. Collect buyer + deposit amount, POST to
 *      `/api/v1/public/share/[token]/reserve`.
 *   2. On 201, show the IPS QR (if pre-rendered) + reference and a
 *      "kapara ističe u X" countdown.
 *
 * The form is intentionally minimal — no address, no ID number.
 * KYC happens later, only if the investor confirms the deposit.
 */
export function PublicReservationForm(props: {
  token: string;
  currency: string;
  suggestedDeposit: string | null;
  organizationName: string;
  unitCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [deposit, setDeposit] = useState(props.suggestedDeposit ?? "");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string;
    ipsReference: string;
    ipsQrAvailable: boolean;
    expiresAt: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Morate prihvatiti obradu podataka.");
      return;
    }
    const amount = Number(deposit.replace(/[^0-9.,]/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Iznos kapare mora biti pozitivan broj.");
      return;
    }
    setBusy(true);
    try {
      const referralCode = readReferralFromLocation();
      const res = await fetch(`/api/v1/public/share/${props.token}/reserve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          depositAmount: amount,
          notes: notes.trim() || null,
          referralCode: referralCode || null,
        }),
      });
      if (res.status === 429) {
        throw new Error(
          "Previše zahteva sa ove IP adrese. Pokušajte ponovo za koji trenutak.",
        );
      }
      const payload = (await res.json().catch(() => ({}))) as {
        data?: {
          id: string;
          ipsReference: string;
          ipsQrAvailable: boolean;
          expiresAt: string;
        };
        error?: { message?: string };
      };
      if (!res.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Greška prilikom slanja zahteva.",
        );
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className="rounded-md border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-brand-800)]">
          Zahtev je prosleđen investitoru
        </h2>
        <p className="mt-1 text-sm text-[var(--color-brand-800)]">
          Uplatite kaparu na dole naznačen račun i pozovite se na broj{" "}
          <code className="rounded bg-white px-1.5 py-0.5">
            {result.ipsReference}
          </code>
          . Investitor će potvrditi uplatu i rezervisati jedinicu na vaše ime.
        </p>
        <p className="mt-1 text-xs text-[var(--color-brand-800)]">
          Rezervacija ističe {new Date(result.expiresAt).toLocaleString("sr-Latn-RS")}.
        </p>
        {result.ipsQrAvailable ? (
          <div className="mt-3 rounded-md border border-[var(--color-border)] bg-white p-3 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/public/reservation-requests/${result.id}/qr`}
              alt="IPS QR kod za uplatu"
              width={220}
              height={220}
              className="mx-auto"
            />
            <p className="mt-2 text-[10px] text-[var(--color-foreground-muted)]">
              Skenirajte kod u vašoj bankarskoj aplikaciji da automatski popunite podatke za uplatu.
            </p>
          </div>
        ) : null}
      </section>
    );
  }

  if (!open) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Zainteresovani ste za {props.unitCode}?</h2>
            <p className="mt-1 text-xs text-[var(--color-foreground-muted)]">
              Rezervišite jedinicu online — investitor drži jedinicu za vas dok
              se uplata ne obradi.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Rezerviši uz kaparu</Button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Zahtev za rezervaciju</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--color-foreground-muted)] hover:underline"
        >
          Zatvori
        </button>
      </div>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">Ime *</span>
          <input
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">Prezime *</span>
          <input
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">E-mail *</span>
          <input
            type="email"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={320}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">Telefon *</span>
          <input
            type="tel"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={40}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">
            Iznos kapare ({props.currency}) *
          </span>
          <input
            inputMode="decimal"
            className="h-10 w-full rounded-md border border-[var(--color-border)] px-3 text-sm"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            required
            placeholder={props.suggestedDeposit ?? "npr. 1000"}
          />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="mb-1 block text-[var(--color-foreground-muted)]">
            Napomena za investitora (opcionalno)
          </span>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-[var(--color-border)] p-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>
        <label className="flex items-start gap-2 text-xs sm:col-span-2">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Prihvatam obradu podataka od strane {props.organizationName} radi
            obrade ovog zahteva. Podaci se čuvaju najduže 30 dana.
          </span>
        </label>
        {error ? (
          <p className="text-xs text-red-700 sm:col-span-2">{error}</p>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" loading={busy}>
            Pošalji zahtev
          </Button>
        </div>
      </form>
    </section>
  );
}

function readReferralFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("ref");
  if (q) return q.slice(0, 32);
  const cookie = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("pd_ref="));
  return cookie ? decodeURIComponent(cookie.slice("pd_ref=".length)).slice(0, 32) : null;
}
