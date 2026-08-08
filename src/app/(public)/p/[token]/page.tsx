import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import {
  recordShareView,
  resolvePublicUnitOffer,
  type PublicUnitOffer,
} from "@/server/services/sharing/share-links.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

const UNIT_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Stan",
  GARAGE: "Garaža",
  PARKING_SPACE: "Parking",
  STORAGE: "Ostava",
  COMMERCIAL: "Lokal",
  HOUSE: "Kuća",
  OTHER: "Ostalo",
};

/**
 * Emit `noindex` so shared offers never surface in Google. Twitter
 * and Open Graph tags come from the resolved offer — this is what
 * makes the link render nicely inside Viber / WhatsApp previews.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const offer = await resolvePublicUnitOffer(token);
  if (!offer) {
    return { title: "Ponuda nije dostupna", robots: { index: false, follow: false } };
  }
  const title = `${offer.project.name} · ${offer.unit.code}`;
  const description = offer.unit.publicDescription ?? offer.project.publicDescription ?? undefined;
  const cover = offer.images.find((i) => i.isCover) ?? offer.images[0];
  const image = cover
    ? `/api/public/share/${token}/image/${cover.documentId}`
    : offer.project.coverImageUrl ?? undefined;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicUnitOfferPage({ params }: PageProps) {
  const { token } = await params;
  const offer = await resolvePublicUnitOffer(token);
  if (!offer) return notFound();

  // Fire-and-forget: view counter is nice to have but must never
  // block the render.
  recordShareView(token).catch(() => {});

  return <OfferView offer={offer} token={token} />;
}

function OfferView({ offer, token }: { offer: PublicUnitOffer; token: string }) {
  const priceString =
    offer.showPrice && offer.unit.price
      ? formatMoney(offer.unit.price, offer.unit.currency as SupportedCurrency)
      : null;

  return (
    <main className="min-h-dvh bg-[var(--color-surface-muted)] text-[var(--color-foreground)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          {offer.organization.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={offer.organization.logoUrl}
              alt={offer.organization.name}
              className="h-8 w-auto"
            />
          ) : null}
          <div className="text-sm font-semibold">{offer.organization.name}</div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div>
          <div className="text-xs font-mono uppercase tracking-wide text-[var(--color-foreground-muted)]">
            {offer.project.name}
            {offer.project.city ? ` · ${offer.project.city}` : ""}
          </div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {UNIT_TYPE_LABELS[offer.unit.type] ?? offer.unit.type} {offer.unit.code}
          </h1>
          {priceString ? (
            <div className="mt-1 text-2xl font-semibold text-[var(--color-brand-700)]">
              {priceString}
            </div>
          ) : null}
        </div>

        {offer.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {offer.images.map((img) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.documentId}
                src={`/api/public/share/${token}/image/${img.documentId}`}
                alt={img.fileName}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-md border border-[var(--color-border)] object-cover"
              />
            ))}
          </div>
        ) : offer.project.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={offer.project.coverImageUrl}
            alt={offer.project.name}
            className="w-full rounded-md border border-[var(--color-border)] object-cover"
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">Karakteristike</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="Tip" value={UNIT_TYPE_LABELS[offer.unit.type] ?? offer.unit.type} />
              <InfoRow label="Struktura" value={offer.unit.structure ?? "—"} />
              <InfoRow
                label="Ukupna površina"
                value={`${offer.unit.totalArea} m²`}
              />
              {offer.unit.internalArea ? (
                <InfoRow label="Neto" value={`${offer.unit.internalArea} m²`} />
              ) : null}
              {offer.unit.terraceArea ? (
                <InfoRow label="Terasa" value={`${offer.unit.terraceArea} m²`} />
              ) : null}
              {offer.unit.gardenArea ? (
                <InfoRow label="Bašta" value={`${offer.unit.gardenArea} m²`} />
              ) : null}
              {offer.unit.bedrooms != null ? (
                <InfoRow label="Spavaće" value={String(offer.unit.bedrooms)} />
              ) : null}
              {offer.unit.bathrooms != null ? (
                <InfoRow label="Kupatila" value={String(offer.unit.bathrooms)} />
              ) : null}
              {offer.unit.orientation ? (
                <InfoRow label="Orijentacija" value={offer.unit.orientation} />
              ) : null}
            </dl>
          </section>

          <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">Kontakt</h2>
            <div className="mt-2 space-y-1 text-sm">
              <div>{offer.organization.name}</div>
              {offer.organization.phone ? (
                <a
                  href={`tel:${offer.organization.phone}`}
                  className="block text-[var(--color-brand-700)] hover:underline"
                >
                  {offer.organization.phone}
                </a>
              ) : null}
              {offer.organization.email ? (
                <a
                  href={`mailto:${offer.organization.email}`}
                  className="block text-[var(--color-brand-700)] hover:underline"
                >
                  {offer.organization.email}
                </a>
              ) : null}
              {offer.organization.website ? (
                <a
                  href={offer.organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[var(--color-brand-700)] hover:underline"
                >
                  {offer.organization.website}
                </a>
              ) : null}
              {offer.project.address ? (
                <div className="text-[var(--color-foreground-muted)]">
                  {offer.project.address}
                  {offer.project.city ? `, ${offer.project.city}` : ""}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {offer.unit.publicDescription ? (
          <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">O jedinici</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {offer.unit.publicDescription}
            </p>
          </section>
        ) : null}

        {offer.project.publicDescription ? (
          <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold">O projektu</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {offer.project.publicDescription}
            </p>
          </section>
        ) : null}
      </div>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-4 text-center text-xs text-[var(--color-foreground-muted)]">
        Ova ponuda je privatna. Iznos i dostupnost mogu se promeniti bez najave.
      </footer>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wide text-[var(--color-foreground-muted)]">
        {label}
      </dt>
      <dd className="text-sm">{value}</dd>
    </>
  );
}
