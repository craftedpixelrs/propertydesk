"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Lead-capture form on the marketing landing page.
 *
 * Posts a JSON payload to our own `POST /api/v1/marketing/leads`
 * endpoint, which then upserts the contact into Loops via the
 * server-to-server API. The Loops key never touches the browser and
 * the endpoint is rate-limited (5 req/min per IP).
 *
 * Fields:
 *   - firstName, lastName, email, phone           - required
 *   - audience (INVESTOR | AGENCY)                - required
 *   - companyName, projectCount, city, note       - optional
 *   - consent                                     - required (GDPR)
 *   - website (honeypot, hidden)                  - must be empty
 *
 * UTM parameters and referrer are picked up from `window.location`
 * / `document.referrer` on mount so we can attribute leads without a
 * separate analytics call.
 */

type Audience = "INVESTOR" | "AGENCY";

type ProjectCount =
  | "ZERO"
  | "ONE_TWO"
  | "THREE_FIVE"
  | "SIX_TEN"
  | "TEN_PLUS";

interface FieldErrors {
  [field: string]: string[];
}

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string; fields?: FieldErrors };

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string }> = [
  { value: "INVESTOR", label: "Investitor" },
  { value: "AGENCY", label: "Agencija za nekretnine" },
];

const PROJECT_COUNT_OPTIONS: Array<{ value: ProjectCount; label: string }> = [
  { value: "ZERO", label: "0 - u pripremi" },
  { value: "ONE_TWO", label: "1–2 projekta" },
  { value: "THREE_FIVE", label: "3–5 projekata" },
  { value: "SIX_TEN", label: "6–10 projekata" },
  { value: "TEN_PLUS", label: "10+ projekata" },
];

export function LeadForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [audience, setAudience] = useState<Audience | "">("");
  const formRef = useRef<HTMLFormElement | null>(null);

  // Capture UTM/referrer info once on mount and stash it in refs so
  // we don't have to plumb it through form fields as visible inputs.
  const utmRef = useRef<{
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
  }>({});

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      utmRef.current = {
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        referrer: document.referrer || undefined,
      };
    } catch {
      // Fallback silently - attribution is nice-to-have, not critical.
    }
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    // Client-side guard for the audience radio (native `required`
    // works on <input type="radio"> but only if the group is properly
    // rendered - belt-and-braces).
    const audienceValue = String(fd.get("audience") ?? "").trim();
    if (audienceValue !== "INVESTOR" && audienceValue !== "AGENCY") {
      setState({
        kind: "error",
        message: "Molimo označite da li ste investitor ili agencija.",
      });
      return;
    }

    const payload = {
      firstName: String(fd.get("firstName") ?? "").trim(),
      lastName: String(fd.get("lastName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      companyName: String(fd.get("companyName") ?? "").trim() || undefined,
      audience: audienceValue as Audience,
      projectCount:
        (String(fd.get("projectCount") ?? "").trim() as ProjectCount) ||
        undefined,
      city: String(fd.get("city") ?? "").trim() || undefined,
      note: String(fd.get("note") ?? "").trim() || undefined,
      consent: fd.get("consent") === "on",
      website: String(fd.get("website") ?? ""),
      ...utmRef.current,
    };

    startTransition(async () => {
      setState({ kind: "submitting" });
      try {
        const res = await fetch("/api/v1/marketing/leads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Envelope: `{ data, error, meta }` - see @/lib/api/response.
        const json = (await res
          .json()
          .catch(() => null)) as
          | {
              data?: { ok?: boolean };
              error?: {
                code?: string;
                message?: string;
                fieldErrors?: FieldErrors;
              };
            }
          | null;

        if (!res.ok || !json || json.error) {
          const fields = json?.error?.fieldErrors;
          const message =
            json?.error?.message ??
            (res.status === 429
              ? "Previše pokušaja. Sačekajte minut i pokušajte ponovo."
              : "Slanje nije uspelo. Pokušajte ponovo za koji trenutak.");
          setState({ kind: "error", message, fields });
          return;
        }

        setState({ kind: "success" });
        form.reset();
        setAudience("");
      } catch (err) {
        setState({
          kind: "error",
          message:
            err instanceof Error && err.message.includes("Failed to fetch")
              ? "Nema veze sa serverom. Proverite internet i pokušajte ponovo."
              : "Slanje nije uspelo. Pokušajte ponovo za koji trenutak.",
        });
      }
    });
  };

  const fieldError = (name: string): string | undefined => {
    if (state.kind !== "error" || !state.fields) return undefined;
    const errs = state.fields[name];
    return errs && errs.length > 0 ? errs[0] : undefined;
  };

  return (
    <section
      id="prijava"
      aria-labelledby="lead-title"
      className="scroll-mt-20 border-t border-[var(--color-border)]"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
              Rani pristup
            </div>
            <h2
              id="lead-title"
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Prijavite se za rani pristup i besplatnu obuku
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              Ostavite kontakt - javljamo se u roku od 2 radna dana radi
              dogovora za demo i obuku u trajanju od sat vremena. Prijavljeni
              korisnici automatski ostvaruju pravo na{" "}
              <strong className="font-semibold text-[var(--color-foreground)]">
                50% popusta prva 3 meseca
              </strong>{" "}
              nakon lansiranja 01.09.2026.
            </p>

            <ul className="mt-6 space-y-2.5 text-sm text-[var(--color-foreground-muted)]">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
                />
                <span>Bez obaveze - sve dok Vi ne odlučite drugačije.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
                />
                <span>Podaci ostaju u EU, brišu se na Vaš zahtev.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 flex-none text-[var(--color-success)]"
                />
                <span>
                  Obuka je nezavisna od aplikacije - koristi Vam i ako
                  izaberete drugu platformu.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
            {state.kind === "success" ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center gap-3 py-8 text-center"
              >
                <span
                  aria-hidden
                  className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]"
                >
                  <CheckCircle2 className="size-7" />
                </span>
                <h3 className="text-xl font-bold">Hvala Vam na prijavi!</h3>
                <p className="max-w-md text-sm text-[var(--color-foreground-muted)]">
                  Javljamo se u roku od 2 radna dana radi dogovora za demo i
                  obuku. Do tada, slobodno pogledajte ostatak stranice.
                </p>
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={onSubmit}
                className="space-y-4"
                aria-describedby={
                  state.kind === "error" ? "lead-error" : undefined
                }
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ime" required error={fieldError("firstName")}>
                    <Input
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Marko"
                      required
                      maxLength={80}
                    />
                  </Field>
                  <Field
                    label="Prezime"
                    required
                    error={fieldError("lastName")}
                  >
                    <Input
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Marković"
                      required
                      maxLength={80}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" required error={fieldError("email")}>
                    <Input
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="ime@firma.rs"
                      required
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Telefon" required error={fieldError("phone")}>
                    <Input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+381 60 000 0000"
                      required
                      maxLength={40}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Naziv firme"
                    hint="opciono"
                    error={fieldError("companyName")}
                  >
                    <Input
                      name="companyName"
                      type="text"
                      autoComplete="organization"
                      placeholder="AKME Nekretnine d.o.o."
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label="Grad"
                    hint="opciono"
                    error={fieldError("city")}
                  >
                    <Input
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="Beograd"
                      maxLength={80}
                    />
                  </Field>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-[var(--color-foreground)]">
                    Ko ste Vi?{" "}
                    <span className="text-[var(--color-danger)]">*</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AUDIENCE_OPTIONS.map((opt) => {
                      const selected = audience === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-3 text-sm transition",
                            selected
                              ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                              : "border-[var(--color-border)] hover:border-[var(--color-brand-200)]",
                          )}
                        >
                          <input
                            type="radio"
                            name="audience"
                            value={opt.value}
                            checked={selected}
                            onChange={() => setAudience(opt.value)}
                            className="accent-[var(--color-brand-600)]"
                            required
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldError("audience") ? (
                    <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                      {fieldError("audience")}
                    </p>
                  ) : null}
                </fieldset>

                <Field
                  label="Broj projekata koji trenutno vodite / prodajete"
                  hint="opciono"
                  error={fieldError("projectCount")}
                >
                  <select
                    name="projectCount"
                    defaultValue=""
                    className="block min-h-11 w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-foreground)] shadow-sm outline-none focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-100)] sm:min-h-10 sm:text-sm"
                  >
                    <option value="">Izaberite…</option>
                    {PROJECT_COUNT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Napomena"
                  hint="opciono"
                  error={fieldError("note")}
                >
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={2000}
                    className="block w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-foreground)] shadow-sm outline-none placeholder:text-[var(--color-foreground-subtle)] focus:border-[var(--color-brand-600)] focus:ring-2 focus:ring-[var(--color-brand-100)] sm:text-sm"
                    placeholder="Recite nam ukratko šta prodajete i koje su Vaše najveće prepreke trenutno."
                  />
                </Field>

                {/* Honeypot - bots fill this, humans don't see it. */}
                <div
                  aria-hidden
                  className="hidden"
                  style={{ position: "absolute", left: "-10000px" }}
                >
                  <label>
                    Website
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>

                <label className="flex items-start gap-2 text-xs text-[var(--color-foreground-muted)]">
                  <input
                    type="checkbox"
                    name="consent"
                    required
                    className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]"
                  />
                  <span>
                    Saglasan/a sam da PropertyDesk koristi ove podatke
                    isključivo radi kontaktiranja u vezi sa ranim pristupom,
                    demoom i obukom. Podatke mogu povući u bilo kom trenutku
                    slanjem mejla na{" "}
                    <a
                      href="mailto:marko.banovic@craftedpixel.rs"
                      className="underline hover:text-[var(--color-brand-700)]"
                    >
                      marko.banovic@craftedpixel.rs
                    </a>
                    .
                  </span>
                </label>

                {state.kind === "error" ? (
                  <div
                    id="lead-error"
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]"
                  >
                    <AlertCircle
                      aria-hidden
                      className="mt-0.5 size-4 flex-none"
                    />
                    <span>{state.message}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={isPending || state.kind === "submitting"}
                >
                  Pošalji prijavu
                </Button>
                <p className="text-center text-[11px] text-[var(--color-foreground-subtle)]">
                  Nakon slanja, kontaktiramo Vas u roku od 2 radna dana.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Small label + input wrapper. Extracted so every field renders with
 * consistent spacing, required/optional hints, and inline error text.
 */
function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="flex items-baseline justify-between gap-2 font-medium text-[var(--color-foreground)]">
        <span>
          {label}
          {required ? (
            <span className="ml-1 text-[var(--color-danger)]">*</span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-[11px] font-normal text-[var(--color-foreground-subtle)]">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : null}
    </label>
  );
}
