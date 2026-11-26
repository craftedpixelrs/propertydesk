import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { BlogFigure } from "@/features/marketing/blog/blog-figure";
import { blogImagePath, publicFileReady } from "@/features/marketing/blog/image";
import {
  blogLocale,
  blogPostBySlug,
  BLOG_POSTS,
  relatedPosts,
} from "@/features/marketing/blog/posts";
import { ReadingProgress } from "@/features/marketing/blog/reading-progress";
import { RichText } from "@/features/marketing/blog/rich-text";
import { CtaPanel } from "@/features/marketing/landing/cta-panel";
import { RuleHeading } from "@/features/marketing/ui";
import { APP_NAME, COMPANY, MARKETING_URL } from "@/lib/constants/app";
import { createT, htmlLang } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { JsonLd } from "@/lib/seo/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPostBySlug(slug);
  if (!post) return {};
  const locale = await resolveRequestLocale();
  const copy = post.copy[blogLocale(locale)];
  const url = `${MARKETING_URL}/blog/${post.slug}`;
  const imagePath = blogImagePath(post.coverFile);
  const image = publicFileReady(imagePath) ? `${MARKETING_URL}${imagePath}` : undefined;

  return {
    // Blog post titles are long operational phrases; adding " | PropertyDesk"
    // pushed every page over 70 chars (Ahrefs flagged 5 as "Title too long").
    // The brand still appears via og:site_name and the Organization JSON-LD.
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: url,
      languages: { "sr-Latn": url, "x-default": url },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url,
      type: "article",
      publishedTime: post.published,
      modifiedTime: post.modified,
      locale: locale === "en" ? "en_GB" : "sr_Latn",
      siteName: APP_NAME,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: copy.coverAlt }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: copy.title,
      description: copy.description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = blogPostBySlug(slug);
  if (!post) notFound();

  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const lang = blogLocale(locale);
  const copy = post.copy[lang];
  const url = `${MARKETING_URL}/blog/${post.slug}`;
  const imagePath = blogImagePath(post.coverFile);
  const image = publicFileReady(imagePath) ? `${MARKETING_URL}${imagePath}` : undefined;
  const more = relatedPosts(post.slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    headline: copy.title,
    description: copy.description,
    datePublished: post.published,
    dateModified: post.modified,
    inLanguage: htmlLang(locale),
    author: {
      "@type": "Person",
      name: "Marko Banović",
      url: `${MARKETING_URL}/o-nama`,
    },
    publisher: {
      "@type": "Organization",
      name: APP_NAME,
      url: `${MARKETING_URL}/`,
      email: COMPANY.email,
    },
    ...(image ? { image: [image] } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: APP_NAME, item: `${MARKETING_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: t("marketing.blog.indexLabel"),
        item: `${MARKETING_URL}/blog`,
      },
      { "@type": "ListItem", position: 3, name: copy.title, item: url },
    ],
  };

  return (
    <>
      <ReadingProgress minutes={post.minutes} targetId="blog-article" />
      <article id="blog-article" className="bg-white">
        <header className="border-line bg-paper relative overflow-hidden border-b">
          <div
            aria-hidden
            className="pd-grid pd-fade-radial pointer-events-none absolute inset-0"
          />
          <div className="container-app pd-rise relative max-w-3xl pt-24 pb-12 sm:pt-28 sm:pb-16">
            <p className="text-faint flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
              <Link href="/blog" className="hover:text-ink transition-colors">
                {t("marketing.blog.indexLabel")}
              </Link>
              <span aria-hidden className="text-line">
                /
              </span>
              <span className="text-tide-700">{copy.dateLabel}</span>
            </p>
            <h1 className="text-ink mt-6 text-[2.1rem] leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-5xl">
              {copy.title}
            </h1>
            <p className="text-mute mt-5 text-base leading-relaxed text-pretty sm:text-lg">
              {copy.description}
            </p>
            <div className="border-line mt-8 flex items-center gap-3 border-t pt-5">
              <span
                aria-hidden
                className="bg-ink text-tide-300 grid size-9 flex-none place-items-center rounded-xl font-mono text-[11px] font-medium"
              >
                MB
              </span>
              <p className="text-mute text-sm">
                {t("marketing.blog.byline")}
                <span className="text-line px-2">·</span>
                {t("marketing.blog.minutes", { count: post.minutes })}
              </p>
            </div>
          </div>
        </header>

        <div className="container-app max-w-3xl py-10 sm:py-14">
          <BlogFigure
            file={post.coverFile}
            alt={copy.coverAlt}
            width={1200}
            height={630}
            priority
            sizes="(min-width: 768px) 768px, 100vw"
          />

          <div className="text-ink/80 mt-10 space-y-5 text-[1.05rem] leading-[1.75]">
            {copy.blocks.map((block, index) => {
              if (block.type === "h2") {
                return (
                  <h2
                    key={block.id}
                    id={block.id}
                    className="text-ink scroll-mt-32 pt-8 text-[1.7rem] leading-tight font-bold tracking-[-0.03em] sm:text-[2rem]"
                  >
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "figure") {
                return (
                  <div key={block.file} className="py-3">
                    <BlogFigure
                      file={block.file}
                      alt={block.alt}
                      width={block.width}
                      height={block.height}
                      sizes="(min-width: 768px) 768px, 100vw"
                    />
                  </div>
                );
              }
              if (block.type === "ul") {
                return (
                  <ul key={`ul-${index}`} className="space-y-2.5">
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden className="bg-tide mt-[0.7em] size-1.5 flex-none" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={`p-${index}`}>
                  <RichText text={block.text} />
                </p>
              );
            })}
          </div>
        </div>
      </article>

      <section aria-labelledby="more-posts" className="border-line border-t">
        <div className="container-app max-w-3xl py-14">
          <RuleHeading id="more-posts">{t("marketing.blog.related")}</RuleHeading>
          <ul className="border-line mt-6 border-t">
            {more.map((item) => (
              <li key={item.slug} className="border-line border-b">
                <Link
                  href={`/blog/${item.slug}`}
                  className="group text-ink hover:text-tide-700 flex items-center justify-between gap-6 py-5 text-lg leading-snug font-bold tracking-[-0.02em] transition-colors sm:text-xl"
                >
                  {item.copy[lang].title}
                  <ArrowUpRight aria-hidden className="text-tide-700 size-5 flex-none" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaPanel />
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
    </>
  );
}
