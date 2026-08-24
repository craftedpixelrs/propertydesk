import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { absoluteCoverImageUrl } from "@/lib/geo/cover-image";
import { REFERRAL_COOKIE, sanitizeReferralCode } from "@/lib/referral";
import { hostFromHeaders } from "@/lib/seo/hosts";

import { createT } from "@/lib/i18n";
import { PublicProjectUnitsCatalog } from "@/features/public/public-project-units";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function readReferralCode(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<string | null> {
  const raw = searchParams.ref;
  const fromQuery = sanitizeReferralCode(Array.isArray(raw) ? raw[0] : raw);
  if (fromQuery) return fromQuery;
  const jar = await cookies();
  return sanitizeReferralCode(jar.get(REFERRAL_COOKIE)?.value);
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const referralCode = await readReferralCode(await searchParams);
  const site = await resolvePublicProjectSite(slug, { referralCode });
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

export default async function PublicProjectMicrosite({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const referralCode = await readReferralCode(await searchParams);
  const site = await resolvePublicProjectSite(slug, { referralCode });
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {site.organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.organization.logoUrl}
                alt={site.organization.name}
                className="h-12 w-auto max-h-16 max-w-[200px] shrink-0 object-contain object-left sm:h-16 sm:max-w-[280px]"
              />
            ) : null}
            <div className="min-w-0">
              <div className="truncate text-xs uppercase tracking-wide text-neutral-500">
                {site.organization.name}
              </div>
              <div className="truncate text-lg font-semibold leading-tight sm:text-xl">
                {site.project.name}
              </div>
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

      <div className="mx-auto max-w-6xl px-6 pb-10">
        <PublicProjectUnitsCatalog
          units={unitsWithTokens}
          referralCode={referralCode}
        />
      </div>
    </main>
  );
}
