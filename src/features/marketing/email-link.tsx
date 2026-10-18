/**
 * Email link / email text wrappers that opt out of Cloudflare's
 * "Email Address Obfuscation" feature (Scrape Shield).
 *
 * Without this opt-out Cloudflare rewrites every `<a href="mailto:...">`
 * in our rendered HTML into a link pointing at
 * `/cdn-cgi/l/email-protection#<obfuscated>`. That URL returns a 404 to
 * crawlers, which is why Ahrefs reported 39 broken internal links from
 * every page containing our contact email.
 *
 * The documented per-element opt-out is to wrap the markup in
 * `<!--email_off-->...<!--/email_off-->` HTML comments. Those comments
 * must survive React rendering intact. We can't use `react-dom/server`
 * from inside the component tree (Next 16 forbids it to protect the
 * client bundle), so we build the final HTML string ourselves and emit
 * it via `dangerouslySetInnerHTML` on a single wrapper element.
 *
 * Reference: https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
 */

import type { CSSProperties } from "react";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(innerHtml: string): string {
  return `<!--email_off-->${innerHtml}<!--/email_off-->`;
}

interface EmailLinkProps {
  /** The email address, e.g. "hello@propertydesk.app". */
  email: string;
  /** Visible label (defaults to the email itself). */
  label?: string;
  /** Classes applied to the inner <a>. */
  className?: string;
  /** Optional subject prefill for the mailto URL. */
  subject?: string;
  /** aria-label for assistive tech. */
  ariaLabel?: string;
  /**
   * Optional pre-serialised HTML inserted before the email label inside
   * the `<a>` (used by callers who need an SVG icon alongside the email).
   * Must be caller-trusted markup — not user input.
   */
  iconHtml?: string;
}

/**
 * Mailto link that Cloudflare will not rewrite. Builds the HTML as a
 * string so the `<!--email_off-->` comment pair survives into the
 * server-rendered response Cloudflare parses on its edge.
 *
 * For callers that need an icon inside the link, pre-serialise the SVG
 * markup via `MAIL_ICON_HTML` or similar and pass it as `iconHtml`.
 */
export function EmailLink({
  email,
  label,
  className,
  subject,
  ariaLabel,
  iconHtml,
}: EmailLinkProps) {
  const href = subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
  const ariaAttr = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : "";
  const inner = `${iconHtml ?? ""}${escapeHtml(label ?? email)}`;
  const html = wrap(`<a href="${escapeHtml(href)}"${classAttr}${ariaAttr}>${inner}</a>`);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Inline email address as plain text (no link), wrapped in the opt-out
 * comment pair. Use inside body copy where the email should be visible
 * but not clickable (e.g. legal paragraphs).
 */
export function EmailText({ email, className }: { email: string; className?: string }) {
  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
  const html = wrap(`<span${classAttr}>${escapeHtml(email)}</span>`);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Wraps a chunk of pre-serialised HTML in Cloudflare's email-off comment
 * pair. Use when the markup you want to protect is already a string
 * (e.g. a legal document rendered through its own template).
 */
export function EmailOffHtml({
  html,
  as: Tag = "div",
  className,
  style,
}: {
  html: string;
  as?: "div" | "span" | "article" | "section";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: wrap(html) }}
    />
  );
}

/**
 * Pre-serialised Lucide `Mail` icon SVG. We can't render Lucide React
 * components inside the `dangerouslySetInnerHTML` string, so inline the
 * SVG once and share it across call sites. Matches `<Mail className="size-4" />`
 * output 1:1 (`currentColor` stroke, 24×24 viewBox, size-4 → 1rem).
 */
export const MAIL_ICON_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail inline-block align-middle" style="margin-right:0.375rem;vertical-align:-2px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/></svg>';
