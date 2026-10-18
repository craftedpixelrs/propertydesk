import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

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
        <header className="bg-[#0b1020] text-[#f7f3ea]">
          <div className="container-app max-w-3xl pt-20 pb-14 sm:pt-24 sm:pb-20">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#d6b26a] uppercase">
              <Link href="/blog" className="hover:text-white">
                {t("marketing.blog.indexLabel")}
              </Link>
              <span className="px-2 text-white/30">/</span>
              {copy.dateLabel}
            </p>
            <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/70 sm:text-lg">
              {copy.description}
            </p>
            <p className="mt-6 text-sm text-white/55">
              {t("marketing.blog.byline")}
              <span className="px-2 text-white/30">·</span>
              {t("marketing.blog.minutes", { count: post.minutes })}
            </p>
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

          <div className="mt-10 space-y-5 text-base leading-relaxed text-[#243044]">
            {copy.blocks.map((block, index) => {
              if (block.type === "h2") {
                return (
                  <h2
                    key={block.id}
                    id={block.id}
                    className="font-display scroll-mt-32 pt-6 text-3xl font-semibold text-[#0b1020]"
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
                  <ul key={`ul-${index}`} className="list-disc space-y-2 pl-5">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
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

      <section aria-labelledby="more-posts" className="border-t border-[#0b1020]/10 bg-[#f7f3ea]">
        <div className="container-app max-w-3xl py-12">
          <h2 id="more-posts" className="font-display text-3xl font-semibold text-[#0b1020]">
            {t("marketing.blog.related")}
          </h2>
          <ul className="mt-5 space-y-3">
            {more.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/blog/${item.slug}`}
                  className="font-display text-xl font-semibold text-[#0b1020] underline decoration-[#d6b26a] underline-offset-4 hover:text-[#9a7430]"
                >
                  {item.copy[lang].title}
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
