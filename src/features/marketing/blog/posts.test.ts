import { describe, expect, it } from "vitest";

import { BLOG_POSTS } from "./posts";
import type { BlogCopy } from "./types";

const INTERNAL = new Set([
  "/",
  "/#cenovnik",
  "/demo",
  "/blog",
  "/za-investitore",
  "/za-agencije",
  "/alternative-excelu",
  "/rezervacije-i-uplate",
  "/provizije-agencija",
  "/crm-za-investitore",
  "/prodaja-novogradnje",
  "/privatnost",
  ...BLOG_POSTS.map((post) => `/blog/${post.slug}`),
]);

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

function words(copy: BlogCopy): number {
  const parts: string[] = [];
  for (const block of copy.blocks) {
    if (block.type === "p") {
      parts.push(
        block.text.replace(/\[[^\]]+\]\([^)]+\)/g, (token) => token.slice(1, token.indexOf("]"))),
      );
    } else if (block.type === "h2") parts.push(block.text);
    else if (block.type === "ul") parts.push(...block.items);
  }
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}

function linksIn(text: string): string[] {
  return [...text.matchAll(/\]\(((?:https:\/\/|\/)[^)\s]+)\)/g)].map((match) => match[1] ?? "");
}

describe("blog posts", () => {
  it("stays between 1400 and 2000 words in both languages", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const post of BLOG_POSTS) {
      expect(post.published >= "2026-09-01" && post.published <= "2026-10-05").toBe(true);
      expect(post.modified >= post.published).toBe(true);
      for (const locale of ["sr", "en"] as const) {
        const count = words(post.copy[locale]);
        expect(count, `${post.slug} ${locale} ${count}`).toBeGreaterThanOrEqual(1400);
        expect(count, `${post.slug} ${locale} ${count}`).toBeLessThanOrEqual(2000);
      }
      expect(post.copy.sr.description.length).toBeLessThan(170);
      expect(post.copy.en.description.length).toBeLessThan(165);
      const figures = post.copy.sr.blocks.filter((block) => block.type === "figure");
      expect(figures.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("links only to real pages and official external hosts", () => {
    for (const post of BLOG_POSTS) {
      for (const locale of ["sr", "en"] as const) {
        const hrefs = post.copy[locale].blocks.flatMap((block) =>
          block.type === "p" ? linksIn(block.text) : [],
        );
        const blogs = hrefs.filter((href) => href.startsWith("/blog/"));
        expect(blogs.length, post.slug).toBeGreaterThanOrEqual(2);
        for (const href of hrefs) {
          if (href.startsWith("/")) {
            expect(INTERNAL.has(href), `${post.slug} ${locale} ${href}`).toBe(true);
          } else {
            expect(EXTERNAL_HOSTS.has(new URL(href).hostname), href).toBe(true);
          }
        }
      }
    }
  });
});
