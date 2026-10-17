import type { Metadata } from "next";
import Link from "next/link";

import { BlogFigure } from "@/features/marketing/blog/blog-figure";
import { blogLocale, blogPostsNewestFirst } from "@/features/marketing/blog/posts";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
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
      <section className="bg-[#0b1020] text-[#f7f3ea]">
        <div className="container-app py-16 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#d6b26a] uppercase">
            {t("marketing.blog.eyebrow")}
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            {t("marketing.blog.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {t("marketing.blog.subtitle")}
          </p>
        </div>
      </section>

      <section className="bg-white">
        <div className="container-app grid gap-6 py-14 sm:py-16">
          {posts.map((post, index) => {
            const copy = post.copy[lang];
            return (
              <article
                key={post.slug}
                className="grid items-center gap-6 rounded-3xl border border-[#0b1020]/10 bg-[#f7f3ea] p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              >
                <BlogFigure
                  file={post.coverFile}
                  alt={copy.coverAlt}
                  width={1200}
                  height={630}
                  priority={index === 0}
                  sizes="(min-width: 1024px) 420px, 100vw"
                />
                <div className="px-2 py-2 sm:px-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#9a7430] uppercase">
                    {copy.dateLabel}
                    <span className="px-2 text-[#0b1020]/30">/</span>
                    {t("marketing.blog.minutes", { count: post.minutes })}
                  </p>
                  <h2 className="font-display mt-3 text-3xl font-semibold text-[#0b1020]">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[#9a7430]">
                      {copy.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)] sm:text-base">
                    {copy.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex text-sm font-semibold text-[#0b1020] underline decoration-[#d6b26a] underline-offset-4"
                  >
                    {t("marketing.blog.read")}
                  </Link>
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
