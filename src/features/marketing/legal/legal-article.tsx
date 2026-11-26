import { PageIntro } from "@/features/marketing/ui";

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
    <article>
      <span style={DISPLAY_CONTENTS} dangerouslySetInnerHTML={EMAIL_OFF_OPEN} />
      <PageIntro trail={[{ label: doc.updated }]} title={doc.title} lead={doc.intro} narrow />
      <div className="bg-white">
        <div className="container-app max-w-3xl py-12 sm:py-16">
          <div className="border-line border-t">
            {doc.sections.map((section, i) => (
              <section
                key={section.heading}
                className="border-line grid gap-x-6 gap-y-2 border-b py-8 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
              >
                <span
                  aria-hidden
                  className="text-tide-700 pt-1 font-mono text-[11px] font-medium tracking-[0.14em] tabular-nums"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    id={/kolač|cookie/i.test(section.heading) ? "kolacici" : undefined}
                    className="text-ink scroll-mt-24 text-xl leading-snug font-bold tracking-[-0.02em]"
                  >
                    {section.heading}
                  </h2>
                  <div className="text-mute mt-3 space-y-3 text-[0.95rem] leading-relaxed">
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 48)}>{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      <span style={DISPLAY_CONTENTS} dangerouslySetInnerHTML={EMAIL_OFF_CLOSE} />
    </article>
  );
}
