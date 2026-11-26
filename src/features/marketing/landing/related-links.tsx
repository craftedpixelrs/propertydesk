import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { RuleHeading } from "@/features/marketing/ui";

/**
 * Inline "Povezano" section used across landing pages to surface related
 * topic pages (hub, city pages, blog posts, etc.). A ruled label and a
 * row of squared chips; two of these can stack on city pages without
 * reading as one strip.
 */
export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="border-line border-t" aria-label={title}>
      <div className="container-app py-10 sm:py-12">
        <RuleHeading>{title}</RuleHeading>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group border-line text-ink hover:border-ink hover:bg-ink inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold transition-colors duration-200 hover:text-white"
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  aria-hidden
                  className="text-tide-700 group-hover:text-tide-300 size-4"
                  strokeWidth={2}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
