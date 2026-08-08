import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Pair {
  problem: string;
  solution: string;
}

interface ProblemSolutionGridProps {
  title?: string;
  subtitle?: string;
  items: Pair[];
}

/**
 * Two-column "Problem vs PropertyDesk rešenje" grid used by the topic
 * landing pages. Each row is one pain-point on the left and the
 * corresponding platform capability on the right.
 */
export function ProblemSolutionGrid({
  title = "Šta vas boli danas i kako to PropertyDesk rešava",
  subtitle,
  items,
}: ProblemSolutionGridProps) {
  return (
    <section
      aria-labelledby="ps-title"
      className="bg-white"
    >
      <div className="container-app py-16 sm:py-20">
        <div className="max-w-3xl">
          <h2
            id="ps-title"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-10 space-y-4">
          {items.map((it, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:grid-cols-2 sm:p-6"
            >
              <div className="flex items-start gap-3 sm:pr-4 sm:border-r sm:border-[var(--color-border)]">
                <span
                  aria-hidden
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-red-50 text-red-600"
                >
                  <AlertTriangle className="size-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-600">
                    Problem
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-foreground)]">
                    {it.problem}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:pl-4">
                <span
                  aria-hidden
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                >
                  <CheckCircle2 className="size-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
                    PropertyDesk
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-foreground)]">
                    {it.solution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
