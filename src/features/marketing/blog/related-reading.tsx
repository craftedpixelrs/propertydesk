import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { blogLocale, blogPostBySlug } from "@/features/marketing/blog/posts";
import { RuleHeading } from "@/features/marketing/ui";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

export async function RelatedReading({ slugs }: { slugs: string[] }) {
  const locale = await resolveRequestLocale();
  const t = createT(locale);
  const lang = blogLocale(locale);
  const posts = slugs
    .map((slug) => blogPostBySlug(slug))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-reading-title" className="border-line border-t">
      <div className="container-app py-14 sm:py-16">
        <RuleHeading id="related-reading-title">{t("marketing.blog.related")}</RuleHeading>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group border-line hover:border-ink/30 flex h-full items-start justify-between gap-4 rounded-2xl border bg-white p-6 transition duration-300 hover:shadow-[0_24px_50px_-36px_rgba(10,27,61,0.5)]"
              >
                <span>
                  <span className="text-faint font-mono text-[11px] font-medium tracking-[0.14em] uppercase">
                    {post.copy[lang].dateLabel}
                  </span>
                  <span className="text-ink group-hover:text-tide-700 mt-2.5 block text-lg leading-snug font-bold tracking-[-0.025em] transition-colors">
                    {post.copy[lang].title}
                  </span>
                </span>
                <ArrowUpRight aria-hidden className="text-tide-700 mt-1 size-5 flex-none" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
