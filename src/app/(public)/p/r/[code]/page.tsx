import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { absoluteCoverImageUrl } from "@/lib/geo/cover-image";
import { hostFromHeaders } from "@/lib/seo/hosts";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { resolveReferralCatalog } from "@/server/services/agencies/referral-catalog.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const t = createT(await resolveRequestLocale());
  const catalog = await resolveReferralCatalog(code);
  if (!catalog) {
    return {
      title: t("marketing.public.referralUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const title = `${catalog.investorName} · ${t("marketing.public.referralCatalogTitle")}`;
  const description = t("marketing.public.referralCatalogVia", {
    agency: catalog.agencyName,
  });
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublicReferralCatalogPage({ params }: PageProps) {
  const { code } = await params;
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const catalog = await resolveReferralCatalog(code);
  if (!catalog) return notFound();

  if (catalog.projects.length === 1) {
    const only = catalog.projects[0]!;
    redirect(`/p/projekat/${only.slug}?ref=${encodeURIComponent(catalog.code)}`);
  }

  const host = hostFromHeaders(await headers());
  const origin = host ? `https://${host}` : "";

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5 sm:gap-5">
          {catalog.investorLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={catalog.investorLogoUrl}
              alt={catalog.investorName}
              className="h-12 w-auto max-h-16 max-w-[200px] shrink-0 object-contain object-left sm:h-16 sm:max-w-[280px]"
            />
          ) : null}
          <div className="min-w-0">
            <div className="truncate text-xs uppercase tracking-wide text-neutral-500">
              {catalog.investorName}
            </div>
            <h1 className="truncate text-lg font-semibold leading-tight sm:text-xl">
              {t("marketing.public.referralCatalogTitle")}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {t("marketing.public.referralCatalogVia", { agency: catalog.agencyName })}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {catalog.projects.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            {t("marketing.public.referralCatalogEmpty")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.projects.map((project) => {
              const cover = project.coverImageUrl
                ? absoluteCoverImageUrl(project.coverImageUrl, origin)
                : null;
              return (
                <Link
                  key={project.id}
                  href={`/p/projekat/${project.slug}?ref=${encodeURIComponent(catalog.code)}`}
                  className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:border-[var(--color-brand-500)] hover:shadow-md"
                >
                  <div className="relative h-40 w-full bg-neutral-100">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={project.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        {t("marketing.public.noImage")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-lg font-semibold">{project.name}</h2>
                    <p className="text-xs text-neutral-500">
                      {project.code}
                      {project.city ? ` · ${project.city}` : ""}
                    </p>
                    {project.description ? (
                      <p className="line-clamp-3 text-sm text-neutral-600">
                        {project.description}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--color-brand-700)]">
                      {t("marketing.public.viewProject")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
