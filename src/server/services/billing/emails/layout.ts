/**
 * Branded email layout for billing lifecycle emails.
 *
 * The point of this module is to keep every billing email (14 templates and
 * counting) inside a single, opinionated visual shell — logo, brand bar,
 * card, buttons, footer — while letting the individual templates provide
 * only the "inner" content. That way we can polish the shell in one place
 * and every notification (invoice issued, reminders, subscription events)
 * benefits at once.
 *
 * Two audiences use this file:
 *
 *   1. `renderBillingEmail` on the server (see `templates.ts`), which wraps
 *      the DB-stored `bodyHtml` into a full document just before it goes to
 *      `sendEmail`.
 *   2. The admin preview (see `template-editor.tsx`), which imports this
 *      same wrapper so that the live iframe preview looks 1:1 with what the
 *      customer will receive.
 *
 * IMPORTANT: this file is NOT `server-only`. It must remain a pure module
 * of HTML-string helpers so the client-side preview can call it without
 * hitting the network. Do not import Prisma, `server-only`, or Node APIs
 * here.
 *
 * Email HTML conventions used below:
 *   - `<table role="presentation">` scaffold (Outlook + iOS Mail need this).
 *   - Inline CSS on every element that matters — hosted email clients strip
 *     most `<style>` blocks. The tiny `<style>` block we keep is only for
 *     mobile media queries and dark-mode hints.
 *   - CTA buttons use the "bulletproof" `<v:roundrect>` trick for Outlook
 *     (2007–2019 on Windows) — otherwise Outlook renders `<a>` as blue
 *     underlined text and users don't recognise it as a button.
 *   - Rounded corners are 8px; we intentionally avoid heavier radii because
 *     Outlook doesn't render them at all.
 */

// -----------------------------------------------------------------------------
// Palette — mirrors the app tokens but kept as literal hex strings because
// email clients don't understand CSS custom properties.
// -----------------------------------------------------------------------------

const COLORS = {
  brand: "#0f766e",
  brandDark: "#0d5f58",
  brandLight: "#ccfbf1",
  textPrimary: "#0f172a",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  pageBg: "#f4f6fb",
  cardBg: "#ffffff",
  cardBgInset: "#f9fafb",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  success: "#047857",
  successBg: "#d1fae5",
  warning: "#b45309",
  warningBg: "#fef3c7",
  danger: "#b91c1c",
  dangerBg: "#fee2e2",
  info: "#0369a1",
  infoBg: "#dbeafe",
} as const;

const FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BillingEmailTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export interface KeyValuePair {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface BillingEmailCta {
  label: string;
  href: string;
}

export interface WrapBillingEmailInput {
  /** Short preview text shown by inbox clients under the subject. */
  preheader?: string;
  /** Optional pill chip above the title. */
  badge?: { label: string; tone: BillingEmailTone };
  /** H1 shown at the top of the card. */
  title?: string;
  /** Optional paragraph rendered under the title. */
  intro?: string;
  /**
   * Fully-formed inner HTML for the message body (typically produced by
   * `renderKeyValue`, `renderCallout`, and paragraph strings joined
   * together). This is placed inside the card between `intro` and `cta`.
   */
  contentHtml: string;
  /** Optional CTA rendered as a bulletproof button below `contentHtml`. */
  cta?: BillingEmailCta;
  /** Optional small italic note under the CTA (used for FX rate line etc.). */
  footerNote?: string;
  /** Optional issuer/company name shown in the footer. */
  issuerName?: string;
  /** Optional issuer contact line (address, PIB) shown in the footer. */
  issuerAddress?: string;
  /** Optional support email used in the "wrong recipient" footer line. */
  supportEmail?: string;
}

// -----------------------------------------------------------------------------
// Escaping — small local helper. We only escape "text" values a template
// might inject; markup produced by our own helpers is already safe.
// -----------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

// -----------------------------------------------------------------------------
// Tone → color mapping
// -----------------------------------------------------------------------------

function badgeColors(tone: BillingEmailTone): { bg: string; fg: string } {
  switch (tone) {
    case "success":
      return { bg: COLORS.successBg, fg: COLORS.success };
    case "warning":
      return { bg: COLORS.warningBg, fg: COLORS.warning };
    case "danger":
      return { bg: COLORS.dangerBg, fg: COLORS.danger };
    case "muted":
      return { bg: "#e2e8f0", fg: COLORS.textMuted };
    case "info":
    default:
      return { bg: COLORS.brandLight, fg: COLORS.brand };
  }
}

function calloutColors(tone: BillingEmailTone): {
  bg: string;
  fg: string;
  border: string;
} {
  const c = badgeColors(tone);
  return { bg: c.bg, fg: c.fg, border: c.fg };
}

// -----------------------------------------------------------------------------
// Public helpers
// -----------------------------------------------------------------------------

/**
 * Render a pill-style chip. Used both for status badges above the title
 * and for inline emphasis inside content blocks.
 */
export function renderBadge(label: string, tone: BillingEmailTone = "info"): string {
  const { bg, fg } = badgeColors(tone);
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(label)}</span>`;
}

/**
 * Render a key-value information card. Each row is rendered as a two-column
 * table row; the value column is right-aligned and wider on mobile.
 * `emphasize: true` bumps the value to bold + larger (used for totals).
 */
export function renderKeyValue(pairs: KeyValuePair[]): string {
  const rows = pairs
    .map((p, idx) => {
      const isLast = idx === pairs.length - 1;
      const borderBottom = isLast
        ? "none"
        : `1px solid ${COLORS.border}`;
      const valueStyle = p.emphasize
        ? `color:${COLORS.textPrimary};font-size:18px;font-weight:700;`
        : `color:${COLORS.textPrimary};font-size:14px;font-weight:500;`;
      return `<tr>
  <td class="pd-kv-label" style="padding:12px 16px;border-bottom:${borderBottom};color:${COLORS.textMuted};font-size:14px;font-weight:400;vertical-align:top;width:45%;">${escapeHtml(p.label)}</td>
  <td class="pd-kv-value" style="padding:12px 16px;border-bottom:${borderBottom};text-align:right;vertical-align:top;${valueStyle}">${p.value}</td>
</tr>`;
    })
    .join("\n");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid ${COLORS.border};border-radius:8px;background:${COLORS.cardBgInset};margin:0 0 24px 0;">
  <tbody>
${rows}
  </tbody>
</table>`;
}

/**
 * Bulletproof CTA button. Renders as `<v:roundrect>` for Outlook and a
 * styled `<a>` for everything else. The Outlook block is enclosed in a
 * conditional comment so modern clients don't render it twice.
 */
export function renderButton(cta: BillingEmailCta): string {
  const href = escapeAttr(cta.href);
  const label = escapeHtml(cta.label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 24px auto;">
  <tr>
    <td align="center" bgcolor="${COLORS.brand}" style="border-radius:8px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="${COLORS.brand}" fillcolor="${COLORS.brand}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:${FONT_FAMILY};font-size:16px;font-weight:600;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}" style="display:inline-block;padding:14px 28px;background:${COLORS.brand};color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:8px;font-family:${FONT_FAMILY};mso-hide:all;">${label}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/**
 * A colored callout box. Used for "urgent" tones (final notice, suspended,
 * restricted). The callout draws attention without needing a separate
 * template file.
 */
export function renderCallout(text: string, tone: BillingEmailTone = "warning"): string {
  const c = calloutColors(tone);
  return `<div style="margin:0 0 24px 0;padding:12px 16px;background:${c.bg};border-left:4px solid ${c.border};border-radius:6px;color:${c.fg};font-size:14px;line-height:1.5;">${text}</div>`;
}

/**
 * Simple paragraph helper — pre-styled with the correct line-height and
 * text color so template authors don't have to repeat inline CSS.
 */
export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px 0;color:${COLORS.textPrimary};font-size:15px;line-height:1.6;">${text}</p>`;
}

// -----------------------------------------------------------------------------
// Main wrapper
// -----------------------------------------------------------------------------

/**
 * Assemble a full billing email HTML document.
 *
 * The output is a self-contained `<!DOCTYPE html>` string safe to pass to
 * `sendEmail({ message: { html } })` and equally safe to pass to
 * `<iframe srcDoc={...} />` in the admin preview.
 */
export function wrapBillingEmail(input: WrapBillingEmailInput): string {
  const preheader = input.preheader ? escapeHtml(input.preheader) : "";
  const title = input.title ? escapeHtml(input.title) : "";
  const intro = input.intro ? escapeHtml(input.intro) : "";
  const badge = input.badge
    ? renderBadge(input.badge.label, input.badge.tone)
    : "";
  const cta = input.cta ? renderButton(input.cta) : "";
  const footerNote = input.footerNote
    ? `<div style="margin:0 0 16px 0;color:${COLORS.textMuted};font-size:13px;font-style:italic;text-align:center;line-height:1.5;">${escapeHtml(input.footerNote)}</div>`
    : "";
  const issuerName = input.issuerName ?? "PropertyDesk d.o.o.";
  const issuerAddress =
    input.issuerAddress ?? "Naplata i pretplate";
  const supportEmail = input.supportEmail ?? "podrska@propertydesk.app";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="sr" xml:lang="sr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${title || "PropertyDesk"}</title>
<style type="text/css">
  /* Client-specific resets */
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; }
  a { text-decoration: none; }

  /* Mobile */
  @media only screen and (max-width: 620px) {
    .pd-card { width: 100% !important; border-radius: 0 !important; }
    .pd-outer { padding: 0 !important; }
    .pd-inner { padding: 24px 20px !important; }
    .pd-title { font-size: 22px !important; line-height: 1.3 !important; }
    .pd-kv-label, .pd-kv-value { padding: 10px 12px !important; font-size: 13px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.pageBg};font-family:${FONT_FAMILY};color:${COLORS.textPrimary};">
${
  preheader
    ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;color:transparent;">${preheader}</div>`
    : ""
}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:${COLORS.pageBg};">
  <tr>
    <td class="pd-outer" align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="pd-card" style="width:600px;max-width:600px;background:${COLORS.cardBg};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 8px 24px rgba(15,23,42,0.06);">
        <!-- Brand bar -->
        <tr>
          <td style="height:6px;background:${COLORS.brand};line-height:6px;font-size:0;">&nbsp;</td>
        </tr>
        <!-- Header -->
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
              <tr>
                <td align="left" style="font-size:20px;font-weight:700;color:${COLORS.textPrimary};letter-spacing:-0.01em;">PropertyDesk</td>
                <td align="right" style="font-size:13px;color:${COLORS.textMuted};">Naplata i pretplate</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td class="pd-inner" style="padding:24px 32px 32px 32px;">
${badge ? `            <div style="margin:0 0 12px 0;">${badge}</div>\n` : ""}${
    title
      ? `            <h1 class="pd-title" style="margin:0 0 12px 0;font-size:28px;font-weight:700;line-height:1.2;color:${COLORS.textPrimary};letter-spacing:-0.01em;">${title}</h1>\n`
      : ""
  }${
    intro
      ? `            <p style="margin:0 0 24px 0;color:${COLORS.textMuted};font-size:15px;line-height:1.6;">${intro}</p>\n`
      : ""
  }            ${input.contentHtml}
${cta ? `            ${cta}\n` : ""}${footerNote ? `            ${footerNote}\n` : ""}          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px 28px 32px;border-top:1px solid ${COLORS.border};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
              <tr>
                <td align="center" style="font-size:12px;color:${COLORS.textMuted};line-height:1.6;">
                  ${escapeHtml(issuerName)} &middot; ${escapeHtml(issuerAddress)}<br />
                  Ako ste dobili ovu poruku greškom, kontaktirajte
                  <a href="mailto:${escapeAttr(supportEmail)}" style="color:${COLORS.brand};text-decoration:underline;">${escapeHtml(supportEmail)}</a>.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// Detection helper — used by the renderer to avoid double-wrapping legacy
// or hand-authored full-HTML templates.
// -----------------------------------------------------------------------------

/**
 * Return true when the given body string looks like a complete HTML
 * document (starts with `<!doctype` or `<html`). Legacy templates and
 * fully-authored one-offs bypass the wrapper.
 */
export function isFullHtmlDocument(body: string): boolean {
  const trimmed = body.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}
