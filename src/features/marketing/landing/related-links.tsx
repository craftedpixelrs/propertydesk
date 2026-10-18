import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Inline "Povezano" section used across landing pages to surface related
 * topic pages (hub, city pages, blog posts, etc.).
 *
 * October 2026 redesign:
 *  - Added vertical breathing room (`py-10 sm:py-12`) because two sections
 *    sometimes stack on city pages (neighbours + topic links) and the
 *    previous `pt-2 pb-2` made them read as one dense strip.
 *  - Promoted the eyebrow title from a lone 11-px label into a gold
 *    rule-line pattern (`label ━━`) so it reads as a section header.
 *  - Pills now have slightly more padding, a subtle hover shadow + lift,
 *    and an arrow glyph that slides in on hover to reinforce the
 *    "navigate elsewhere" affordance — matches the solution cards on
 *    the problem/solution grid.
 *  - Container capped at `max-w-5xl` so the pills do not stretch across
 *    the full width on 1920+ screens.
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
    <section className="border-t border-[#0b1020]/5 bg-[#f7f3ea]" aria-label={title}>
      <div className="container-app max-w-5xl py-10 sm:py-12">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {title}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-[#9a7430]/15" />
        </div>
        <ul className="mt-5 flex flex-wrap gap-2.5">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[#0b1020]/10 bg-white px-4 py-2 text-sm font-medium text-[#0b1020] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6b26a] hover:text-[#9a7430] hover:shadow-md"
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 -translate-x-1 text-[#9a7430] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  strokeWidth={2.25}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
