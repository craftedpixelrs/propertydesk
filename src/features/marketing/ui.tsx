import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Small uppercase label with a teal tick, used above every section title. */
export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase",
        tone === "dark" ? "text-tide-300" : "text-tide-700",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("h-px w-6", tone === "dark" ? "bg-tide-300/70" : "bg-tide")}
      />
      <span>{children}</span>
    </div>
  );
}

/** A minor section title: mono label, then a rule to the edge. */
export function RuleHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <h2
        id={id}
        className="text-tide-700 flex flex-none items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase"
      >
        <span aria-hidden className="bg-tide h-px w-6" />
        {children}
      </h2>
      <span aria-hidden className="bg-line h-px flex-1" />
    </div>
  );
}

/**
 * Opening band of the reading pages (blog, about, help, legal): the
 * drafting grid, a mono trail saying where you are, one H1 and a lead.
 */
export function PageIntro({
  trail,
  title,
  lead,
  children,
  narrow = false,
}: {
  trail: { label: ReactNode; href?: string }[];
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  /** Match the measure of the article below. */
  narrow?: boolean;
}) {
  return (
    <header className="border-line relative overflow-hidden border-b">
      <div aria-hidden className="pd-grid pd-fade-radial pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-64 right-[-12%] h-[34rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,rgba(11,154,162,0.14),transparent)]"
      />
      <div
        className={cn("container-app pd-rise relative py-14 sm:py-20", narrow ? "max-w-3xl" : null)}
      >
        <p className="text-faint flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
          {trail.map((step, i) => (
            <span key={i} className="contents">
              {i > 0 ? (
                <span aria-hidden className="text-line">
                  /
                </span>
              ) : null}
              {step.href ? (
                <a href={step.href} className="hover:text-ink transition-colors">
                  {step.label}
                </a>
              ) : (
                <span className="text-tide-700">{step.label}</span>
              )}
            </span>
          ))}
        </p>
        <h1 className="text-ink mt-6 max-w-4xl text-[2.3rem] leading-[1.04] font-bold tracking-[-0.04em] text-balance sm:text-5xl lg:text-[3.4rem]">
          {title}
        </h1>
        {lead ? (
          <p className="text-mute mt-6 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </header>
  );
}

const TITLE =
  "mt-4 text-[2rem] leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-[2.6rem] lg:text-[3rem]";

/** Section opener: label, title, optional lead paragraph. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  tone = "light",
  className,
  children,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
  children?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className={cn(TITLE, !eyebrow && "mt-0", dark ? "text-white" : "text-ink")}>
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "mt-5 max-w-2xl text-base leading-relaxed sm:text-[1.05rem]",
            dark ? "text-white/65" : "text-mute",
          )}
        >
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Two-digit index in mono, the way a drawing numbers its parts. */
export function Index({
  n,
  tone = "light",
  className,
}: {
  n: number;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-mono text-[11px] font-medium tracking-[0.14em] tabular-nums",
        tone === "dark" ? "text-tide-300" : "text-tide-700",
        className,
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

/**
 * Stock of a building as a status matrix: one cell per unit. It is the
 * picture of what the product keeps true, drawn without any text.
 * 0 empty, 1 free, 2 reserved, 3 sold.
 */
const MATRIX = [
  [0, 0, 1, 1, 3, 1, 0, 0],
  [0, 1, 3, 2, 3, 3, 1, 0],
  [1, 3, 3, 1, 2, 3, 3, 1],
  [3, 1, 2, 3, 3, 1, 3, 3],
  [3, 3, 3, 1, 3, 2, 1, 3],
  [1, 3, 2, 3, 1, 3, 3, 2],
  [3, 3, 1, 3, 3, 3, 1, 3],
];

export function UnitMatrix({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  const fill = (v: number) => {
    if (v === 1) return dark ? "bg-tide-300" : "bg-tide";
    if (v === 2) return "bg-amber-400";
    if (v === 3) return dark ? "bg-white/25" : "bg-ink";
    return dark ? "border border-dashed border-white/15" : "border border-dashed border-ink/15";
  };
  return (
    <div aria-hidden className={cn("grid grid-cols-8 gap-1.5 sm:gap-2", className)}>
      {MATRIX.flatMap((row, r) =>
        row.map((v, c) => (
          <span
            key={`${r}-${c}`}
            style={{ "--pd-delay": `${(r + c) * 45}ms` } as CSSProperties}
            className={cn("pd-cell aspect-square rounded-[5px]", fill(v))}
          />
        )),
      )}
    </div>
  );
}
