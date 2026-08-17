import type { LegalDoc } from "./copy";

export function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <article className="container-app max-w-3xl py-14 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
        {doc.updated}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
        {doc.intro}
      </p>
      <div className="mt-10 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2
              id={
                /kolač|cookie/i.test(section.heading) ? "kolacici" : undefined
              }
              className="scroll-mt-20 text-lg font-semibold tracking-tight"
            >
              {section.heading}
            </h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
