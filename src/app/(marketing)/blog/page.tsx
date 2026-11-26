import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BlogCover } from "@/features/marketing/blog/blog-figure";
import { blogLocale, blogPostsNewestFirst } from "@/features/marketing/blog/posts";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { PageIntro } from "@/features/marketing/ui";
import { APP_NAME, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const title = t("marketing.blog.metaTitle");
  const description = t("marketing.blog.metaDescription");
  const url = `${MARKETING_URL}/blog`;
  return {
    title: { absolute: `${title} | ${APP_NAME}` },
    description,
    alternates: {
      canonical: url,
      languages: { "sr-Latn": url, "x-default": url },
    },
    openGraph: {
      title: `${title} | ${APP_NAME}`,
      description,
      url,
      type: "website",
      locale: locale === "en" ? "en_GB" : "sr_Latn",
      siteName: APP_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${APP_NAME}`,
      description,
    },
  };
}

export default async function BlogIndexPage() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const lang = blogLocale(locale);
  const posts = blogPostsNewestFirst();
  const url = `${MARKETING_URL}/blog`;

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    name: `${t("marketing.blog.metaTitle")} | ${APP_NAME}`,
    description: t("marketing.blog.metaDescription"),
    url,
    inLanguage: htmlLang(locale),
    publisher: { "@id": `${MARKETING_URL}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.copy[lang].title,
      url: `${MARKETING_URL}/blog/${post.slug}`,
      datePublished: post.published,
      dateModified: post.modified,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: APP_NAME, item: `${MARKETING_URL}/` },
      { "@type": "ListItem", position: 2, name: t("marketing.blog.indexLabel"), item: url },
    ],
  };

  return (
    <>
      <PageIntro
        trail={[
          { label: t("marketing.landing.home"), href: "/" },
          { label: t("marketing.blog.eyebrow") },
        ]}
        title={t("marketing.blog.title")}
        lead={t("marketing.blog.subtitle")}
      />

      <section className="bg-white">
        <div className="container-app grid gap-4 py-14 sm:py-20 lg:grid-cols-2">
          {posts.map((post, index) => {
            const copy = post.copy[lang];
            const lead = index === 0;
            return (
              <article
                key={post.slug}
                className={
                  lead
                    ? "group border-line hover:border-ink/30 relative grid overflow-hidden rounded-3xl border bg-white transition duration-300 hover:shadow-[0_30px_60px_-40px_rgba(10,27,61,0.5)] lg:col-span-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
                    : "group border-line hover:border-ink/30 relative flex flex-col overflow-hidden rounded-3xl border bg-white transition duration-300 hover:shadow-[0_30px_60px_-40px_rgba(10,27,61,0.5)]"
                }
              >
                <BlogCover
                  file={post.coverFile}
                  alt={copy.coverAlt}
                  index={index}
                  priority={lead}
                  sizes={
                    lead ? "(min-width: 1024px) 680px, 100vw" : "(min-width: 1024px) 580px, 100vw"
                  }
                  className={lead ? "lg:aspect-auto lg:h-full lg:min-h-[22rem]" : undefined}
                />
                <div
                  className={
                    lead
                      ? "flex flex-col justify-center p-6 sm:p-10"
                      : "flex flex-1 flex-col p-6 sm:p-8"
                  }
                >
                  <p className="text-faint font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                    {copy.dateLabel}
                    <span className="text-line px-2">/</span>
                    {t("marketing.blog.minutes", { count: post.minutes })}
                  </p>
                  <h2
                    className={
                      lead
                        ? "text-ink mt-4 text-2xl leading-[1.15] font-bold tracking-[-0.03em] sm:text-[2rem]"
                        : "text-ink mt-4 text-xl leading-snug font-bold tracking-[-0.025em] sm:text-2xl"
                    }
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group-hover:text-tide-700 transition-colors after:absolute after:inset-0 after:content-['']"
                    >
                      {copy.title}
                    </Link>
                  </h2>
                  <p className="text-mute mt-3 flex-1 text-sm leading-relaxed sm:text-base">
                    {copy.excerpt}
                  </p>
                  <span className="text-ink mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">
                    {t("marketing.blog.read")}
                    <ArrowUpRight aria-hidden className="text-tide-700 size-4" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <CtaPanel />
      <JsonLd data={blogJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
    </>
  );
}
