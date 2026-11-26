import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { SectionHeading } from "@/features/marketing/ui";
import { createT } from "@/lib/i18n";
import { resolveRequestLocale } from "@/lib/i18n/resolve-locale";
import { cn } from "@/lib/utils";

/** A price list that forked: same cells, two of them disagree. */
function SheetSketch() {
  const cells = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0];
  return (
    <div aria-hidden className="grid grid-cols-5 gap-px overflow-hidden rounded-lg bg-[#dde4ee]">
      {cells.map((v, i) => (
        <span
          key={i}
          className={cn(
            "flex h-6 items-center px-1.5",
            v === 1 ? "bg-amber-100" : v === 2 ? "bg-rose-100" : "bg-white",
          )}
        >
          <span
            className={cn(
              "h-1 rounded-full",
              v === 1 ? "w-full bg-amber-400" : v === 2 ? "w-3/4 bg-rose-400" : "bg-ink/10 w-2/3",
            )}
          />
        </span>
      ))}
    </div>
  );
}

/** Two agencies claiming the same unit in a chat. */
function ChatSketch() {
  return (
    <div aria-hidden className="flex h-full flex-col justify-center gap-2">
      <span className="bg-ink/10 h-5 w-3/5 rounded-full rounded-bl-sm" />
      <span className="h-5 w-2/5 self-end rounded-full rounded-br-sm bg-amber-300" />
      <span className="h-5 w-2/5 rounded-full rounded-bl-sm bg-amber-300" />
      <span className="bg-ink/10 h-5 w-1/2 self-end rounded-full rounded-br-sm" />
    </div>
  );
}

/** One row of units, each with exactly one status. */
function StockSketch() {
  const units = [3, 3, 1, 2, 3, 1, 1, 3, 2, 1, 3, 3, 1, 3, 1, 2, 3, 1];
  return (
    <div aria-hidden className="grid grid-cols-9 gap-1.5">
      {units.map((v, i) => (
        <span
          key={i}
          className={cn(
            "aspect-square rounded-[5px]",
            v === 1 ? "bg-tide-300" : v === 2 ? "bg-amber-400" : "bg-white/20",
          )}
        />
      ))}
    </div>
  );
}

/** The commercial contrast: spreadsheet and chat versus one unit status. */
export async function SalesCompare() {
  const t = createT(await resolveRequestLocale());

  const before = [
    {
      key: "excel",
      title: t("marketing.sales.excelTitle"),
      body: t("marketing.sales.excelBody"),
      sketch: <SheetSketch />,
    },
    {
      key: "viber",
      title: t("marketing.sales.viberTitle"),
      body: t("marketing.sales.viberBody"),
      sketch: <ChatSketch />,
    },
  ];

  return (
    <section aria-labelledby="sales-compare-title" className="scroll-mt-20 bg-white">
      <div className="container-app py-20 sm:py-28">
        <SectionHeading
          id="sales-compare-title"
          eyebrow={t("marketing.sales.eyebrow")}
          title={t("marketing.sales.title")}
          subtitle={t("marketing.sales.subtitle")}
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
          {before.map((col, index) => (
            <article
              key={col.key}
              data-reveal=""
              style={{ "--pd-delay": `${index * 90}ms` } as React.CSSProperties}
              className="border-line bg-paper flex flex-col rounded-2xl border p-5 sm:p-6"
            >
              <div className="border-line h-[7.5rem] rounded-xl border bg-white p-3.5">
                {col.sketch}
              </div>
              <div className="mt-6 flex items-center gap-2.5">
                <span className="grid size-6 place-items-center rounded-full bg-rose-100 text-rose-600">
                  <X aria-hidden className="size-3.5" strokeWidth={2.5} />
                </span>
                <h3 className="text-ink text-xl font-bold tracking-[-0.025em]">{col.title}</h3>
              </div>
              <p className="text-mute mt-3 text-sm leading-relaxed">{col.body}</p>
            </article>
          ))}

          <article
            data-reveal=""
            style={{ "--pd-delay": "180ms" } as React.CSSProperties}
            className="bg-ink relative flex flex-col overflow-hidden rounded-2xl p-5 text-white sm:p-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgba(95,210,216,0.28),transparent)]"
            />
            <div className="relative flex h-[7.5rem] items-center rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="w-full">
                <StockSketch />
              </div>
            </div>
            <div className="relative mt-6 flex items-center gap-2.5">
              <span className="bg-tide-300 text-ink-950 grid size-6 place-items-center rounded-full">
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
              </span>
              <h3 className="text-xl font-bold tracking-[-0.025em]">
                {t("marketing.sales.deskTitle")}
              </h3>
            </div>
            <p className="relative mt-3 text-sm leading-relaxed text-white/70">
              {t("marketing.sales.deskBody")}
            </p>
            <div className="relative mt-auto pt-6">
              <Link
                href="/alternative-excelu"
                className="text-tide-300 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-white"
              >
                {t("marketing.sales.excelLink")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
