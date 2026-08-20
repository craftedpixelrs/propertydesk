import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { absoluteCoverImageUrl } from "@/lib/geo/cover-image";
import { hostFromHeaders } from "@/lib/seo/hosts";

import { formatMoney } from "@/lib/formatters/money";
import type { SupportedCurrency } from "@/lib/constants/app";
import { createT, unitStatusLabel, unitTypeLabel } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import {
  ensureUnitShareLinkForMicrosite,
  resolvePublicProjectSite,
} from "@/server/services/sharing/share-links.service";
import { prisma } from "@/server/db/prisma";
import { ProjectMap } from "@/features/projects/project-map-loader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const site = await resolvePublicProjectSite(slug);
  if (!site) {
    return {
      title: t("marketing.public.projectUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const title = `${site.project.name}${site.project.city ? " · " + site.project.city : ""}`;
  const description =
    site.project.publicDescription?.slice(0, 200) ??
    t("marketing.public.availableUnitsMeta", {
      count: site.units.length,
      name: site.project.name,
    });
  const host = hostFromHeaders(await headers());
  const cover = site.project.coverImageUrl
    ? absoluteCoverImageUrl(
        site.project.coverImageUrl,
        host ? `https://${host}` : "",
      )
    : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: cover ? [{ url: cover }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PublicProjectMicrosite({ params }: PageProps) {
  const { slug } = await params;
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const site = await resolvePublicProjectSite(slug);
  if (!site) return notFound();

  const project = await prisma.project.findUnique({
    where: { id: site.project.id },
    select: { organizationId: true },
  });
  if (!project) return notFound();

  const unitsWithTokens = await Promise.all(
    site.units.map(async (u) => {
      const token =
        u.shareToken ??
        (await ensureUnitShareLinkForMicrosite({
          organizationId: project.organizationId,
          unitId: u.id,
          showPrice: true,
        }));
      return { ...u, shareToken: token };
    }),
  );

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {site.organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.organization.logoUrl}
                alt={site.organization.name}
                className="h-10 w-10 rounded-md object-contain"
              />
            ) : null}
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                {site.organization.name}
              </div>
              <div className="text-lg font-semibold">{site.project.name}</div>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            {site.organization.phone ? (
              <a
                href={`tel:${site.organization.phone}`}
                className="text-[var(--color-brand-700)] hover:underline"
              >
                {site.organization.phone}
              </a>
            ) : null}
            {site.organization.email ? (
              <a
                href={`mailto:${site.organization.email}`}
                className="text-[var(--color-brand-700)] hover:underline"
              >
                {site.organization.email}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {site.project.coverImageUrl ? (
        <div className="relative h-[320px] w-full overflow-hidden bg-neutral-200 sm:h-[420px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={site.project.coverImageUrl}
            alt={site.project.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="text-3xl font-bold sm:text-4xl">{site.project.name}</h1>
            {site.project.address || site.project.city ? (
              <p className="mt-2 text-lg opacity-90">
                {[site.project.address, site.project.city].filter(Boolean).join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{site.project.name}</h1>
          {site.project.address || site.project.city ? (
            <p className="mt-1 text-lg text-neutral-600">
              {[site.project.address, site.project.city].filter(Boolean).join(", ")}
            </p>
          ) : null}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            <h2 className="text-xl font-semibold">{t("marketing.public.aboutProject")}</h2>
            {site.project.publicDescription ? (
              <div className="whitespace-pre-line text-neutral-700">
                {site.project.publicDescription}
              </div>
            ) : (
              <p className="text-neutral-500">
                {t("marketing.public.contactInvestor")}
              </p>
            )}
          </div>
          {site.project.latitude != null && site.project.longitude != null ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {t("marketing.public.location")}
              </h3>
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <ProjectMap
                  latitude={site.project.latitude}
                  longitude={site.project.longitude}
                  heightPx={224}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">
            {t("marketing.public.availableUnits")}
            <span className="ml-2 text-base font-normal text-neutral-500">
              ({unitsWithTokens.length})
            </span>
          </h2>
        </div>

        {unitsWithTokens.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            {t("marketing.public.noUnits")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unitsWithTokens.map((u) => (
              <Link
                key={u.id}
                href={`/p/${u.shareToken}`}
                className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-[var(--color-brand-500)] hover:shadow-md"
              >
                <div className="relative h-40 w-full bg-neutral-100">
                  {u.coverDocumentId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/public/share/${u.shareToken}/image/${u.coverDocumentId}`}
                      alt={u.code}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-neutral-400">
                      {t("marketing.public.noImage")}
                    </div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-700 backdrop-blur">
                    {unitStatusLabel(u.status, locale)}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">
                      {unitTypeLabel(u.type, locale)} {u.code}
                    </h3>
                    {u.structure ? (
                      <span className="text-sm text-neutral-500">{u.structure}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                    <span>
                      {t("marketing.public.areaM2", {
                        value: Number(u.totalArea).toFixed(2),
                      })}
                    </span>
                    {u.bedrooms != null ? (
                      <span>{t("marketing.public.rooms", { count: u.bedrooms })}</span>
                    ) : null}
                    {u.bathrooms != null ? (
                      <span>{t("marketing.public.bathrooms", { count: u.bathrooms })}</span>
                    ) : null}
                    {u.orientation ? <span>{u.orientation}</span> : null}
                  </div>
                  <div className="pt-2 text-lg font-semibold text-[var(--color-brand-700)]">
                    {formatMoney(u.price ?? "0", u.currency as SupportedCurrency)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-16 border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-neutral-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              © {new Date().getFullYear()} {site.organization.name}
            </div>
            {site.organization.website ? (
              <a
                href={site.organization.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {site.organization.website}
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  );
}
