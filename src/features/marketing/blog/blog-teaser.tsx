import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { BlogCover } from "@/features/marketing/blog/blog-figure";
import { blogLocale, blogPostsNewestFirst } from "@/features/marketing/blog/posts";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { SectionHeading } from "@/features/marketing/ui";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function BlogTeaser() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const lang = blogLocale(locale);
  const posts = blogPostsNewestFirst().slice(0, 3);

  return (
    <section aria-labelledby="blog-teaser-title" className="border-line border-t">
      <div className="container-app py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="blog-teaser-title"
            eyebrow={t("marketing.blog.eyebrow")}
            title={t("marketing.blog.homeTitle")}
          />
          <Link href="/blog" className={marketingCta("outline", "md")}>
            {t("marketing.blog.all")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {posts.map((post, index) => {
            const copy = post.copy[lang];
            return (
              <article
                key={post.slug}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="group border-line hover:border-ink/30 relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white transition duration-300 hover:shadow-[0_30px_60px_-40px_rgba(10,27,61,0.5)]"
              >
                <BlogCover
                  file={post.coverFile}
                  alt={copy.coverAlt}
                  index={index}
                  sizes="(min-width: 1024px) 380px, 100vw"
                />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <p className="text-faint font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                    {copy.dateLabel}
                    <span className="text-line px-2">/</span>
                    {t("marketing.blog.minutes", { count: post.minutes })}
                  </p>
                  <h3 className="text-ink mt-4 text-xl leading-snug font-bold tracking-[-0.025em]">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group-hover:text-tide-700 transition-colors after:absolute after:inset-0 after:content-['']"
                    >
                      {copy.title}
                    </Link>
                  </h3>
                  <p className="text-mute mt-3 flex-1 text-sm leading-relaxed">{copy.excerpt}</p>
                  <span className="text-ink mt-6 inline-flex items-center gap-1.5 text-sm font-semibold">
                    {t("marketing.blog.read")}
                    <ArrowUpRight aria-hidden className="text-tide-700 size-4" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
