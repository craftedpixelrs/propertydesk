import Link from "next/link";

import { marketingCta } from "@/features/marketing/marketing-cta";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";

const COLUMNS = [
  {
    key: "excel",
    title: "marketing.sales.excelTitle",
    body: "marketing.sales.excelBody",
    tone: "muted",
  },
  {
    key: "viber",
    title: "marketing.sales.viberTitle",
    body: "marketing.sales.viberBody",
    tone: "muted",
  },
  {
    key: "desk",
    title: "marketing.sales.deskTitle",
    body: "marketing.sales.deskBody",
    tone: "ink",
  },
] as const;

/** The commercial contrast: spreadsheet and chat versus one unit status. */
export async function SalesCompare() {
  const t = createT(await resolveRequestLocale());

  return (
    <section aria-labelledby="sales-compare-title" className="scroll-mt-20 bg-white">
      <div className="container-app py-16 sm:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-[0.18em] text-[#9a7430] uppercase">
            {t("marketing.sales.eyebrow")}
          </div>
          <h2
            id="sales-compare-title"
            className="font-display mt-3 scroll-mt-24 text-4xl font-semibold tracking-tight text-[#0b1020] sm:text-5xl"
          >
            {t("marketing.sales.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-foreground-muted)]">
            {t("marketing.sales.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col, index) => {
            const ink = col.tone === "ink";
            return (
              <article
                key={col.key}
                data-reveal=""
                style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
                className={
                  ink
                    ? "rounded-3xl bg-[#0b1020] p-6 text-[#f7f3ea] sm:p-8"
                    : "rounded-3xl border border-[#0b1020]/10 bg-[#f7f3ea] p-6 sm:p-8"
                }
              >
                <h3
                  className={ink ? "font-display text-2xl" : "font-display text-2xl text-[#0b1020]"}
                >
                  {t(col.title)}
                </h3>
                <p
                  className={
                    ink
                      ? "mt-3 text-sm leading-relaxed text-white/70"
                      : "mt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]"
                  }
                >
                  {t(col.body)}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-8">
          <Link href="/alternative-excelu" className={marketingCta("ink", "md")}>
            {t("marketing.sales.excelLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
