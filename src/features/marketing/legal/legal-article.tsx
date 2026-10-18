import type { LegalDoc } from "./copy";

/**
 * Renders a legal document (privacy / terms / imprint).
 *
 * The visible article tree is rendered normally through React. We also
 * emit a pair of zero-width `<span>` nodes that each contain just a
 * single HTML comment via `dangerouslySetInnerHTML` — these form the
 * Cloudflare `<!--email_off-->...<!--/email_off-->` opt-out pair that
 * stops Cloudflare's "Email Address Obfuscation" from rewriting the
 * contact email mentions inside the paragraphs (Ahrefs flagged
 * `/privatnost`, `/uslovi` and `/impresum` for this).
 *
 * Cloudflare's scraper reads the raw HTML stream on its edge, so even
 * though the comments live inside tiny wrapper spans they still appear
 * in the byte stream between the opening and the body text; that is
 * what the opt-out directive needs. The spans themselves are
 * `display:contents` so they add nothing to the layout.
 *
 * Reference: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
 */

const EMAIL_OFF_OPEN = { __html: "<!--email_off-->" } as const;
const EMAIL_OFF_CLOSE = { __html: "<!--/email_off-->" } as const;
const DISPLAY_CONTENTS: React.CSSProperties = { display: "contents" };

export function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <article className="container-app max-w-3xl py-14 sm:py-16">
      <span style={DISPLAY_CONTENTS} dangerouslySetInnerHTML={EMAIL_OFF_OPEN} />
      <p className="text-xs font-semibold tracking-wider text-[var(--color-foreground-subtle)] uppercase">
        {doc.updated}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--color-foreground-muted)]">
        {doc.intro}
      </p>
      <div className="mt-10 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2
              id={/kolač|cookie/i.test(section.heading) ? "kolacici" : undefined}
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
      <span style={DISPLAY_CONTENTS} dangerouslySetInnerHTML={EMAIL_OFF_CLOSE} />
    </article>
  );
}
