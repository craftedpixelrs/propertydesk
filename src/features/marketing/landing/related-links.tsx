import Link from "next/link";

export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="bg-[#f7f3ea]" aria-label={title}>
      <div className="container-app pt-2 pb-2">
        <h2 className="text-xs font-semibold tracking-[0.16em] text-[#9a7430] uppercase">
          {title}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex rounded-full border border-[#0b1020]/10 bg-white px-3 py-1.5 text-sm text-[#0b1020] transition-colors hover:border-[#d6b26a] hover:bg-[#f3e2bc]/40"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
