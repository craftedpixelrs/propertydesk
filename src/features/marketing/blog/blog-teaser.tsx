import Link from "next/link";

import { BlogFigure } from "@/features/marketing/blog/blog-figure";
import { blogLocale, blogPostsNewestFirst } from "@/features/marketing/blog/posts";
import { marketingCta } from "@/features/marketing/marketing-cta";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function BlogTeaser() {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const lang = blogLocale(locale);
  const posts = blogPostsNewestFirst().slice(0, 3);

  return (
    <section aria-labelledby="blog-teaser-title" className="bg-white">
      <div className="container-app py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
              {t("marketing.blog.eyebrow")}
            </div>
            <h2
              id="blog-teaser-title"
              className="font-display mt-3 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
            >
              {t("marketing.blog.homeTitle")}
            </h2>
          </div>
          <Link href="/blog" className={marketingCta("outline", "sm")}>
            {t("marketing.blog.all")}
          </Link>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {posts.map((post, index) => {
            const copy = post.copy[lang];
            return (
              <article
                key={post.slug}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#0b1020]/10 bg-[#f7f3ea]"
              >
                <BlogFigure
                  file={post.coverFile}
                  alt={copy.coverAlt}
                  width={1200}
                  height={630}
                  sizes="(min-width: 1024px) 360px, 100vw"
                />
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#9a7430] uppercase">
                    {copy.dateLabel}
                  </p>
                  <h3 className="font-display mt-3 text-2xl font-semibold text-[#0b1020]">
                    <Link href={`/blog/${post.slug}`} className="hover:text-[#9a7430]">
                      {copy.title}
                    </Link>
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                    {copy.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 text-sm font-semibold text-[#0b1020] underline decoration-[#d6b26a] underline-offset-4"
                  >
                    {t("marketing.blog.read")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
