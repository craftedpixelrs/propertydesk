import Link from "next/link";

import { blogLocale, blogPostBySlug } from "@/features/marketing/blog/posts";
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
    <section aria-labelledby="related-reading-title" className="bg-[#f7f3ea]">
      <div className="container-app py-14 sm:py-16">
        <h2
          id="related-reading-title"
          className="font-display text-3xl font-semibold text-[#0b1020] sm:text-4xl"
        >
          {t("marketing.blog.related")}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-[#0b1020]/10 bg-white p-5 hover:border-[#d6b26a]"
              >
                <span className="text-xs font-semibold tracking-[0.14em] text-[#9a7430] uppercase">
                  {post.copy[lang].dateLabel}
                </span>
                <span className="font-display mt-2 block text-xl font-semibold text-[#0b1020]">
                  {post.copy[lang].title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
