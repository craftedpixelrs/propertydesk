import Link from "next/link";
import type { ReactNode } from "react";

const TOKEN = /\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]+)\)/g;

const EXTERNAL_HOSTS = new Set([
  "ips.nbs.rs",
  "www.nbs.rs",
  "nbs.rs",
  "webappcenter.nbs.rs",
  "www.efaktura.gov.rs",
  "efaktura.gov.rs",
  "poverenik.rs",
  "www.poverenik.rs",
]);

function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const linkClass =
  "font-medium text-[#0b1020] underline decoration-[#d6b26a] decoration-2 underline-offset-4 hover:text-[#9a7430]";

/** Internal paths and a short allow-list of official https pages. */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = new RegExp(TOKEN.source, "g");
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const label = match[1] ?? "";
    const href = match[2] ?? "/";
    if (!isSafeHref(href)) {
      nodes.push(label);
    } else if (href.startsWith("/")) {
      nodes.push(
        <Link key={`${href}-${index}`} href={href} className={linkClass}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <a
          key={`${href}-${index}`}
          href={href}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
